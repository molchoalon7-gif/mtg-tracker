"use client";

import { useLayoutEffect } from "react";

const generatedUsername = /^@player_[0-9a-f]{8}$/i;

export function GeneratedUsernameGuard() {
  useLayoutEffect(() => {
    const hideGeneratedHandles = (root: ParentNode) => {
      const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll("*"))] : Array.from(root.querySelectorAll("*"));
      for (const element of elements) {
        const text = element.textContent?.trim() ?? "";
        if (generatedUsername.test(text) && element.children.length === 0) {
          (element as HTMLElement).hidden = true;
          (element as HTMLElement).setAttribute("aria-hidden", "true");
        }
      }
    };

    hideGeneratedHandles(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.parentElement) hideGeneratedHandles(mutation.target.parentElement);
        for (const node of Array.from(mutation.addedNodes)) if (node instanceof Element) hideGeneratedHandles(node);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
