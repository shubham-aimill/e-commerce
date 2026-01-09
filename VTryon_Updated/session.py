
import uuid
_SESSIONS = {}

def create_session():
    sid = str(uuid.uuid4())
    _SESSIONS[sid] = []
    return sid

def save_action(session_id, action):
    if session_id in _SESSIONS:
        _SESSIONS[session_id].append(action)

def get_session(session_id):
    return _SESSIONS.get(session_id, [])
