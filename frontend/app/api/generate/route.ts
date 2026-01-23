import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Path to the backend script
    // In development (local): ../backend/dist/index.js (relative to frontend root)
    // In production (Docker): depends on copy structure.
    // We'll assume relative path from process.cwd() works for now.
    
    // Check if we are in Docker or local
    // We construct the path dynamically to avoid build-time resolution issues
    const parts = ['..', 'backend', 'dist', 'index.js'];
    const backendPath = path.join(process.cwd(), ...parts);
    console.log('Backend path:', backendPath);

    return new Promise<Response>((resolve) => {
      const child = spawn('node', [backendPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let outputData = '';
      let errorData = '';

      child.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorData += data.toString();
        // The server prints "TiKz MCP Server running on stdio" to stderr on start
        console.log('Stderr:', data.toString());
      });

      child.on('error', (err) => {
        console.error('Spawn error:', err);
        resolve(NextResponse.json({ error: 'Failed to spawn backend process' }, { status: 500 }));
      });

      child.on('close', (code) => {
        if (code !== 0 && code !== null) { // code might be null if killed? 
             // If the process exited, it might be an error, or just finished.
             // But MCP server is long-running. We send request and expect response.
             // Wait, the current implementation spawns, sends request, reads response, then kills?
             // Yes, for a simple API route, we can spawn a fresh instance for each request.
             // Ideally we'd keep a pool, but fresh is safer for state.
        }
      });

      // Send the request
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'render_tikz',
          arguments: { code },
        },
        id: 1,
      };

      try {
          child.stdin.write(JSON.stringify(request) + '\n');
      } catch (e) {
          console.error("Stdin write error", e);
      }

      // We need to parse the output. It might come in chunks.
      // The MCP server responds with a JSON line.
      
      // Simple buffer accumulator
      let buffer = '';
      child.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('\n')) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const response = JSON.parse(line);
              if (response.id === 1) {
                // Found our response
                child.kill(); // We are done
                if (response.error) {
                    resolve(NextResponse.json({ error: response.error.message }, { status: 500 }));
                } else if (response.result?.content?.[0]?.text) {
                     resolve(NextResponse.json({ svg: response.result.content[0].text }));
                } else {
                     resolve(NextResponse.json({ error: 'Invalid response from backend' }, { status: 500 }));
                }
                return;
              }
            } catch (e) {
              // Not valid JSON yet or partial line, wait for more
            }
          }
          // Keep the last partial line
          // buffer = lines[lines.length - 1]; // logic above splits all, we need to handle partials properly
          // Re-implement simpler line reader:
        }
      });
      
      // Better reader logic (re-binding stdout listener)
      child.stdout.removeAllListeners('data');
      let acc = '';
      child.stdout.on('data', (chunk) => {
          acc += chunk.toString();
          const lines = acc.split('\n');
          // All except last are complete lines
          for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i];
              if (!line.trim()) continue;
              try {
                  const json = JSON.parse(line);
                  if (json.id === 1) {
                      child.kill();
                       if (json.error) {
                            resolve(NextResponse.json({ error: json.error.message }, { status: 500 }));
                        } else if (json.result?.content?.[0]?.text) {
                            // Check if it's an error result (isError: true)
                             if (json.result.isError) {
                                  resolve(NextResponse.json({ error: json.result.content[0].text }, { status: 400 }));
                             } else {
                                  resolve(NextResponse.json({ svg: json.result.content[0].text }));
                             }
                        } else {
                             resolve(NextResponse.json({ error: 'Invalid response structure' }, { status: 500 }));
                        }
                      return;
                  }
              } catch (e) {
                  // ignore
              }
          }
          acc = lines[lines.length - 1];
      });

    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
