async function test() {
  const baseUrl = "https://api.kie.ai/v1";
  const payload = {
    model: "kie-default",
    messages: [{ role: "user", content: "hi" }]
  };
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer "
    },
    body: JSON.stringify(payload)
  });
  console.log(response.status);
  console.log(await response.text());
}

test();
