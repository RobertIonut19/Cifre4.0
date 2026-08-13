import asyncio
import json
import secrets
import uuid
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from room_manager import RoomManager, Room
from game_logic import validate_number
from database import init_db, save_player, get_all_players, get_scores_stats

app = FastAPI(title="4-Digit Number Guessing Game API")

# Initialize SQLite database on startup
init_db()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

room_manager = RoomManager()

class CreateRoomRequest(BaseModel):
    is_bot: bool = False
    game_type: str = "numbers"

class SavePlayerRequest(BaseModel):
    name: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Multi-Game API is running!"}

@app.post("/api/rooms/create")
def create_room(req: CreateRoomRequest):
    room_id = room_manager.create_room(is_bot_game=req.is_bot, game_type=req.game_type)
    return {"room_id": room_id, "is_bot": req.is_bot, "game_type": req.game_type}

@app.get("/api/rooms/waiting")
def get_waiting_rooms(game_type: str = None):
    return room_manager.get_waiting_rooms(game_type=game_type)

@app.get("/api/players")
def get_players_endpoint():
    return get_all_players()

@app.post("/api/players")
def save_player_endpoint(req: SavePlayerRequest):
    success = save_player(req.name)
    return {"success": success, "players": get_all_players()}

@app.get("/api/stats")
def get_stats_endpoint(game_type: str = None):
    return get_scores_stats(game_type=game_type)

@app.get("/api/words/validate/{word}")
def validate_word_dex(word: str):
    from word_game_logic import validate_word_dexonline
    is_valid, message = validate_word_dexonline(word)
    return {"valid": is_valid, "word": word.upper(), "message": message}

@app.get("/api/words/definition/{word}")
def get_word_definition_endpoint(word: str):
    from word_game_logic import get_dexonline_definition
    definition = get_dexonline_definition(word)
    return {"word": word.upper(), "definition": definition}

@app.get("/api/rooms/{room_id}")
def get_room_info(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"room_id": room.room_id, "state": room.state, "player_count": len(room.players), "game_type": room.game_type}


async def broadcast_room_state(room: Room):
    state = room.get_public_state("")
    for pid, pinfo in list(room.players.items()):
        ws: WebSocket = pinfo["websocket"]
        if ws:
            p_state = room.get_public_state(pid)
            try:
                await ws.send_text(json.dumps({"type": "GAME_STATE", "data": p_state}))
            except Exception:
                pass

async def broadcast_chat_message(room: Room, chat_entry: dict):
    for pid, pinfo in list(room.players.items()):
        ws: WebSocket = pinfo["websocket"]
        if ws:
            try:
                await ws.send_text(json.dumps({"type": "CHAT_MESSAGE", "data": chat_entry}))
            except Exception:
                pass

async def handle_bot_turn_if_needed(room: Room):
    if room.is_bot_game and room.state == "PLAYING" and room.current_turn == "BOT_AGENT":
        import asyncio
        await asyncio.sleep(1.2)
        bot_guess = room.bot_agent.make_guess()
        guess_res = room.process_guess("BOT_AGENT", bot_guess)
        if guess_res:
            room.bot_agent.process_feedback(bot_guess, guess_res["exact_matches"])
            await broadcast_room_state(room)


@app.websocket("/ws/{room_id}/{player_name}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_name: str):
    await websocket.accept()

    room = room_manager.get_room(room_id)
    if not room:
        await websocket.send_text(json.dumps({"type": "ERROR", "message": "Camera nu există!"}))
        await websocket.close()
        return

    player_id = secrets.token_hex(4)
    success, actual_pid = room.add_player(player_id, player_name, websocket)
    if not success:
        await websocket.send_text(json.dumps({"type": "ERROR", "message": "Camera este plină!"}))
        await websocket.close()
        return

    player_id = actual_pid

    await websocket.send_text(json.dumps({
        "type": "CONNECTED",
        "data": {"player_id": player_id, "room_id": room_id}
    }))

    await broadcast_room_state(room)
    await handle_bot_turn_if_needed(room)

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
            except Exception:
                continue

            msg_type = msg.get("type")
            payload = msg.get("payload", {})

            if msg_type == "SET_SECRET":
                secret = payload.get("secret", "")
                if room.game_type == "words":
                    from word_game_logic import validate_word_dexonline
                    is_valid, msg_text = validate_word_dexonline(secret)
                    if not is_valid:
                        await websocket.send_text(json.dumps({
                            "type": "ERROR", 
                            "message": msg_text
                        }))
                        continue

                if room.set_secret(player_id, secret):
                    await broadcast_room_state(room)
                    await handle_bot_turn_if_needed(room)
                else:
                    err_msg = "Cuvântul secret trebuie să fie format din 5 litere!" if room.game_type == "words" else "Numărul secret trebuie să fie format din exact 4 cifre (0000 - 9999)!"
                    await websocket.send_text(json.dumps({
                        "type": "ERROR", 
                        "message": err_msg
                    }))

            elif msg_type == "MAKE_GUESS":
                guess_num = payload.get("guess", "")
                if room.current_turn != player_id:
                    await websocket.send_text(json.dumps({
                        "type": "ERROR",
                        "message": "Nu este rândul tău!"
                    }))
                    continue

                if room.game_type == "words":
                    from word_game_logic import validate_word_dexonline
                    is_valid, msg_text = validate_word_dexonline(guess_num)
                    if not is_valid:
                        await websocket.send_text(json.dumps({
                            "type": "ERROR", 
                            "message": msg_text
                        }))
                        continue

                guess_result = room.process_guess(player_id, guess_num)
                if guess_result:
                    await broadcast_room_state(room)
                    await handle_bot_turn_if_needed(room)
                else:
                    await websocket.send_text(json.dumps({
                        "type": "ERROR",
                        "message": "Cuvânt sau număr nevalid sau nu este rândul tău!"
                    }))

            elif msg_type == "RESTART_GAME":
                room.restart_game()
                await broadcast_room_state(room)
                await handle_bot_turn_if_needed(room)

            elif msg_type == "SEND_CHAT":
                text = payload.get("text", "").strip()
                if text:
                    chat_entry = {
                        "sender_id": player_id,
                        "sender_name": player_name,
                        "text": text,
                        "timestamp": payload.get("timestamp", "")
                    }
                    await broadcast_chat_message(room, chat_entry)

    except WebSocketDisconnect:
        is_waiting = (room.state == "WAITING_FOR_PLAYERS")
        room.remove_player(player_id)

        if is_waiting:
            # 2nd player has NOT joined yet. Creator/host left -> DELETE ROOM IMMEDIATELY!
            room_manager.cleanup_room(room_id, force=True)
        else:
            # Game is in progress (2 players joined or bot game)!
            active_humans = [
                pid for pid, pinfo in room.players.items()
                if pid != "BOT_AGENT" and pinfo.get("websocket") is not None
            ]
            if len(active_humans) == 0 and room.is_bot_game:
                room_manager.cleanup_room(room_id, force=True)
            else:
                await broadcast_room_state(room)
