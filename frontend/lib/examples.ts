export const EXAMPLES: { name: string; code: string }[] = [
  {
    name: "Circle and axes",
    code: String.raw`\begin{tikzpicture}
  \draw[->] (-1.5,0) -- (1.5,0) node[right] {$x$};
  \draw[->] (0,-1.5) -- (0,1.5) node[above] {$y$};
  \draw[blue, thick] (0,0) circle (1);
  \fill[red] (45:1) circle (1.5pt) node[above right] {$(\cos\theta, \sin\theta)$};
  \draw (0,0) -- (45:1);
  \draw (0.3,0) arc (0:45:0.3) node[midway, right] {$\theta$};
\end{tikzpicture}`,
  },
  {
    name: "Flowchart",
    code: String.raw`\begin{tikzpicture}[
  node distance=1.2cm,
  box/.style={rectangle, rounded corners, draw, fill=blue!10, minimum width=2.6cm, minimum height=7mm},
  >={Stealth[length=2mm]}
]
  \node[box] (start) {Write TikZ};
  \node[box, below=of start] (render) {Render};
  \node[diamond, draw, fill=orange!15, aspect=2, below=of render] (ok) {Looks right?};
  \node[box, below=of ok, fill=green!15] (done) {Export SVG};
  \draw[->] (start) -- (render);
  \draw[->] (render) -- (ok);
  \draw[->] (ok) -- node[right] {yes} (done);
  \draw[->] (ok.east) -- ++(1,0) |- node[near start, right] {no} (start.east);
\end{tikzpicture}`,
  },
  {
    name: "pgfplots",
    code: String.raw`\begin{tikzpicture}
  \begin{axis}[
    width=8cm, height=5cm,
    axis lines=middle, grid=major,
    xlabel=$x$, ylabel=$y$,
    domain=-3:3, samples=60,
    legend pos=outer north east
  ]
    \addplot[blue, thick] {x^2 / 3};
    \addplot[red, thick] {sin(deg(x))};
    \legend{$x^2/3$, $\sin x$}
  \end{axis}
\end{tikzpicture}`,
  },
  {
    name: "Commutative diagram",
    code: String.raw`\usepackage{tikz-cd}
\begin{tikzcd}
  A \arrow[r, "f"] \arrow[d, "h"'] & B \arrow[d, "g"] \\
  C \arrow[r, "k"'] & D
\end{tikzcd}`,
  },
  {
    name: "Bare commands",
    code: String.raw`% No tikzpicture needed — bare commands are wrapped automatically.
\draw[thick, fill=yellow!30] (0,0) rectangle (2,1);
\draw[thick, ->] (0,0) -- (2,1);
\node at (1,-0.3) {width = 2};`,
  },
];
