import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
const base=process.cwd(), port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
createServer(async(req,res)=>{
  try {
    const u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    const file=resolve(base,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
    if(!(file===base||file.startsWith(base+sep))) {res.writeHead(403);res.end('Forbidden');return;}
    if(!(await stat(file)).isFile()) throw Error('not a file');
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,()=>console.log(`BigBrew capstone prototype: http://localhost:${port}`));
