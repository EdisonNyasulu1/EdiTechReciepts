export function notFound(req, res) {
  res.status(404).json({ error: "Not found." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "The request contained invalid JSON." });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "The request was too large." });

  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
}
