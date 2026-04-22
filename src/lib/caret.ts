export function getCaretCoordinates(el: HTMLTextAreaElement | HTMLInputElement, position: number) {
  const isInput = el.nodeName === "INPUT";
  const div = document.createElement("div");
  document.body.appendChild(div);
  const style = div.style;
  const computed = window.getComputedStyle(el);

  style.whiteSpace = isInput ? "nowrap" : "pre-wrap";
  if (!isInput) style.wordWrap = "break-word";
  style.position = "absolute";
  style.visibility = "hidden";
  style.overflow = "hidden";
  style.top = "0";
  style.left = "-9999px";

  const props = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderStyle",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "textDecoration",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
  ] as const;
  props.forEach((p) => {
    (style as any)[p] = (computed as any)[p];
  });

  div.textContent = el.value.slice(0, position);
  if (isInput) div.textContent = (div.textContent || "").replace(/\s/g, " ");

  const span = document.createElement("span");
  span.textContent = el.value.slice(position) || ".";
  div.appendChild(span);

  const coords = {
    top: span.offsetTop + parseInt(computed.borderTopWidth || "0") - el.scrollTop,
    left: span.offsetLeft + parseInt(computed.borderLeftWidth || "0") - el.scrollLeft,
    height: parseInt(computed.lineHeight || "16"),
  };
  document.body.removeChild(div);
  return coords;
}
