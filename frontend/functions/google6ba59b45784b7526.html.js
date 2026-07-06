export async function onRequest(context) {
  return new Response("google-site-verification: google6ba59b45784b7526.html", {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
