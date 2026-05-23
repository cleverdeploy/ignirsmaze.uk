(function () {
  "use strict";
  const choicesEl = document.getElementById("oracle-choices");
  const passagesEl = document.getElementById("oracle-passages");
  const promptEl = document.getElementById("oracle-prompt");

  // Tree: each node has prompt, choices (3), and a passage shown when chosen.
  // Depth 2 = 9 leaves. Each leaf has a final passage.
  const TREE = {
    prompt: "Three embers. Choose one to feed.",
    choices: [
      {
        label: "the smallest",
        passage: "The smallest ember takes your breath and asks for more. It will not blaze, but it will not die.",
        node: {
          prompt: "It glows steadier. Behind it, a corridor — three signs.",
          choices: [
            {
              label: "a stair down",
              passage: "You take the stair. Each step echoes twice, the second from below. At the bottom: a room you have already left.",
              leaf: "Here the ember finds its first home. You leave it on a stone shelf and walk back up. The corridor is shorter now.",
            },
            {
              label: "a low arch",
              passage: "You bow under the arch. The stone here is warm, and lettered. Names you almost recognise.",
              leaf: "Among the names is one written in your hand. The ember settles into the carved letter and stays.",
            },
            {
              label: "a curtain of cloth",
              passage: "You part the curtain. It is heavier than it looks. On the other side: a small market, long abandoned.",
              leaf: "A single stall holds a single mirror. You set the ember on its frame. The mirror reflects only the ember.",
            },
          ],
        },
      },
      {
        label: "the brightest",
        passage: "The brightest ember swells under your hand. You feel it briefly as a fever, then it is gone — into a lamp you did not see before.",
        node: {
          prompt: "The lamp lifts itself. It would lead you somewhere.",
          choices: [
            {
              label: "follow the lamp",
              passage: "The lamp moves down corridors that you did not choose. After a long while, it stops at a wall, and waits.",
              leaf: "You feel the wall. It is not a wall. It is a door, and the lamp is the key. You do not open it. You go back. The lamp follows.",
            },
            {
              label: "ask the lamp a question",
              passage: "You ask, aloud, what is on the other side of the wall. The lamp dims, briefly, then brightens.",
              leaf: "That, it seems, is the answer. You consider asking a different question. You do not.",
            },
            {
              label: "blow it out",
              passage: "You blow. The lamp goes dark. So does the corridor. You stand still. You can hear, very faintly, someone breathing in time with you.",
              leaf: "After a long time, your eyes adjust. You realise the breathing is your own, echoed from inside the lamp.",
            },
          ],
        },
      },
      {
        label: "the one furthest from you",
        passage: "You reach across. The ember does not move. You feed it anyway, with the air between your hand and the wall.",
        node: {
          prompt: "The ember begins to look like a small face. It speaks.",
          choices: [
            {
              label: "listen",
              passage: "It speaks slowly, in a language you knew once. The shapes of the words feel like your mother's house.",
              leaf: "When the speaking is done, the ember is gone. In its place, a small grey stone. You put it in your pocket. It is still warm.",
            },
            {
              label: "answer back",
              passage: "You answer. You don't know what you have said. The ember laughs without sound.",
              leaf: "Somewhere far off, you hear someone — perhaps you — repeating your words back. You stop answering. The ember waits, patient.",
            },
            {
              label: "leave it",
              passage: "You walk on. After three corners, you realise the ember is in your hand. After three more, the small face is yours.",
              leaf: "You set the ember down where the corridor splits. It will be there when someone else comes. It is patient.",
            },
          ],
        },
      },
    ],
  };

  function renderNode(node, path) {
    promptEl.textContent = node.prompt;
    choicesEl.innerHTML = "";
    node.choices.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.className = "oracle-choice";
      btn.type = "button";
      btn.textContent = c.label;
      btn.addEventListener("click", () => choose(c, [...path, i]));
      choicesEl.appendChild(btn);
    });
  }

  function showPassage(text, opts) {
    const p = document.createElement("p");
    p.className = "oracle-passage" + (opts && opts.leaf ? " oracle-leaf" : "");
    p.textContent = text;
    passagesEl.appendChild(p);
    requestAnimationFrame(() => p.classList.add("show"));
  }

  function choose(c, path) {
    if (window.IM) IM.event("oracle-choose", { path: path.join(",") });
    showPassage(c.passage);
    if (c.node) {
      renderNode(c.node, path);
    } else if (c.leaf) {
      showPassage(c.leaf, { leaf: true });
      choicesEl.innerHTML = "";
      promptEl.textContent = "the ember settles.";
      if (window.IM) IM.event("oracle-complete", { path: path.join(",") });
    }
  }

  renderNode(TREE, []);
})();
