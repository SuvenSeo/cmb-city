"""Blender MCP Client: Communicates directly with the running Blender MCP socket server."""
import socket
import json
import sys

HOST = 'localhost'
PORT = 9876

def send_command(command_type, params=None, timeout=180.0):
    params = params or {}
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((HOST, PORT))
        cmd_payload = json.dumps({"type": command_type, "params": params})
        sock.sendall(cmd_payload.encode('utf-8'))
        
        chunks = []
        while True:
            chunk = sock.recv(8192)
            if not chunk:
                break
            chunks.append(chunk)
            data = b''.join(chunks)
            try:
                result = json.loads(data.decode('utf-8'))
                return result
            except json.JSONDecodeError:
                continue
        if chunks:
            return json.loads(b''.join(chunks).decode('utf-8'))
        return {"error": "No response received"}
    except Exception as e:
        return {"error": str(e)}
    finally:
        sock.close()

def execute_blender_code(code):
    return send_command("execute_code", {"code": code})

def get_scene():
    return send_command("get_scene_info")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        print("Testing Blender MCP connection...")
        info = get_scene()
        print("Scene Info:", json.dumps(info, indent=2))
