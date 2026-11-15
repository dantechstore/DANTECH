#!/usr/bin/env python3
"""Servidor local SOLO LECTURA para probar la beta de DANTESTORE en un iPhone (misma red Wi-Fi).
No publica nada, no usa Internet y no modifica archivos. Detener con Ctrl+C.
Uso:  python3 herramientas/servir_beta.py [puerto]      (Windows: py herramientas/servir_beta.py)
Expone únicamente /beta/, /img/ y /data/ (no los respaldos ni las herramientas)."""
import http.server,socketserver,socket,sys,os
RAIZ=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUERTO=int(sys.argv[1]) if len(sys.argv)>1 else 8000
PERMITIDOS=('/beta/','/img/','/data/')
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k):super().__init__(*a,directory=RAIZ,**k)
    def do_GET(s):
        p=s.path.split('?')[0].split('#')[0]
        if p in('/','/beta'):s.send_response(302);s.send_header('Location','/beta/');s.end_headers();return
        if not p.startswith(PERMITIDOS):s.send_error(403,'Ruta no permitida');return
        super().do_GET()
    do_HEAD=do_GET
    def end_headers(s):s.send_header('Cache-Control','no-store');super().end_headers()   # siempre la versión más reciente
    def log_message(s,f,*a):sys.stdout.write('  '+(f%a)+'\n')
def ips():
    r=set()
    try:
        for i in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET):r.add(i[4][0])
    except Exception:pass
    try:
        t=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);t.connect(('10.255.255.255',1));r.add(t.getsockname()[0]);t.close()   # no envía datos
    except Exception:pass
    return sorted(x for x in r if not x.startswith('127.'))
socketserver.TCPServer.allow_reuse_address=True
with socketserver.ThreadingTCPServer(('0.0.0.0',PUERTO),H) as s:
    print('\nDANTESTORE beta - servidor de prueba (solo lectura)\n')
    print('En tu computador:   http://localhost:%d/beta/'%PUERTO)
    for ip in ips():print('En tu iPhone (mismo Wi-Fi):   http://%s:%d/beta/'%(ip,PUERTO))
    print('\nDeja esta ventana abierta mientras pruebas. Para terminar: Ctrl+C.\n')
    try:s.serve_forever()
    except KeyboardInterrupt:print('\nServidor detenido.')
