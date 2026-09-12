"""Blender MCP socket server: drive a running Blender from Colombo Atlas tooling.

Run:
  blender --background --python scripts/blender_mcp_server.py

Listens on 127.0.0.1:9876 and speaks the same protocol as
scripts/blender_mcp_client.py: one JSON object {"type": ..., "params": {...}}
per connection, one JSON object back, then the connection closes.

Message types:
  execute_code   {code}            exec() code with `bpy` in scope; set RESULT
                                   to return a value (returned as repr).
  get_scene_info {}                objects / materials / collections summary.
  render         {filepath, engine, samples, res_x, res_y}
                                   render the active scene camera to filepath.
  save           {filepath}        save the current .blend file.
  shutdown       {}                stop the server (Blender exits).
"""
import json
import socket
import traceback

import bpy

HOST = "127.0.0.1"
PORT = 9876
BUFFER = 65536
MAX_REQUEST = 8 * 1024 * 1024


def _tri_count(obj):
    try:
        mesh = obj.data
        return sum(len(p.vertices) - 2 for p in mesh.polygons)
    except Exception:
        return 0


def get_scene_info(_params):
    objects = []
    for o in bpy.data.objects:
        try:
            loc = [round(v, 3) for v in o.location]
            dim = [round(v, 3) for v in o.dimensions]
        except Exception:
            loc, dim = None, None
        objects.append(
            {
                "name": o.name,
                "type": o.type,
                "location": loc,
                "dimensions": dim,
                "triangles": _tri_count(o) if o.type == "MESH" else 0,
                "material": o.data.materials[0].name
                if o.type == "MESH"
                and o.data
                and len(getattr(o.data, "materials", []))
                else None,
            }
        )
    return {
        "status": "ok",
        "blend": bpy.data.filepath,
        "objects": len(objects),
        "meshes": sum(1 for o in objects if o["type"] == "MESH"),
        "materials": sorted(m.name for m in bpy.data.materials),
        "collections": sorted(c.name for c in bpy.data.collections),
        "total_triangles": sum(o["triangles"] for o in objects),
        "sample": objects[:60],
    }


def execute_code(params):
    code = params.get("code", "")
    namespace = {"bpy": bpy}
    try:
        exec(compile(code, "<mcp>", "exec"), namespace)
        return {"status": "ok", "result": repr(namespace.get("RESULT"))}
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc(limit=12),
        }


def render(params):
    filepath = params.get("filepath")
    if not filepath:
        return {"status": "error", "message": "render.filepath is required"}
    scene = bpy.context.scene
    if scene.camera is None:
        return {"status": "error", "message": "scene has no active camera"}
    if params.get("engine"):
        scene.render.engine = params["engine"]
    if params.get("samples"):
        try:
            scene.cycles.samples = int(params["samples"])
        except Exception:
            pass
    if params.get("res_x"):
        scene.render.resolution_x = int(params["res_x"])
    if params.get("res_y"):
        scene.render.resolution_y = int(params["res_y"])
    scene.render.filepath = filepath
    try:
        bpy.ops.render.render(write_still=True)
        return {"status": "ok", "filepath": filepath}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def save(params):
    filepath = params.get("filepath") or bpy.data.filepath
    if not filepath:
        return {"status": "error", "message": "no filepath to save to"}
    try:
        bpy.ops.wm.save_as_mainfile(filepath=filepath)
        return {"status": "ok", "filepath": filepath}
    except Exception as e:
        return {"status": "error", "message": str(e)}


HANDLERS = {
    "execute_code": execute_code,
    "get_scene_info": get_scene_info,
    "render": render,
    "save": save,
}


def read_request(conn):
    conn.settimeout(120.0)
    data = b""
    while len(data) < MAX_REQUEST:
        chunk = conn.recv(BUFFER)
        if not chunk:
            break
        data += chunk
        try:
            return json.loads(data.decode("utf-8"))
        except json.JSONDecodeError:
            continue
    return {"type": "__invalid__"}


def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print("BLENDER_MCP_READY on %s:%d" % (HOST, PORT), flush=True)
    running = True
    while running:
        try:
            conn, _addr = server.accept()
        except Exception:
            continue
        try:
            msg = read_request(conn)
            mtype = msg.get("type") if isinstance(msg, dict) else None
            if mtype == "shutdown":
                conn.sendall(json.dumps({"status": "ok"}).encode("utf-8"))
                running = False
            elif mtype in HANDLERS:
                try:
                    response = HANDLERS[mtype](msg.get("params") or {})
                except Exception as e:
                    response = {"status": "error", "message": str(e)}
                conn.sendall(json.dumps(response).encode("utf-8"))
            else:
                conn.sendall(
                    json.dumps(
                        {"status": "error", "message": "unknown type: %r" % (mtype,)}
                    ).encode("utf-8")
                )
        except Exception as e:
            try:
                conn.sendall(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
            except Exception:
                pass
        finally:
            try:
                conn.close()
            except Exception:
                pass
    server.close()


main()
