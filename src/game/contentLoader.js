export async function loadContent() {
  const [objectsRes, jokesRes] = await Promise.all([
    fetch('./content/objects.json'),
    fetch('./content/jokes.json'),
  ]);
  const [objectsData, jokesData] = await Promise.all([objectsRes.json(), jokesRes.json()]);
  return { objectsData, jokesData };
}
