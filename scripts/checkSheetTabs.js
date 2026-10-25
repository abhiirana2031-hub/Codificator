async function checkTabs() {
  const url = 'https://docs.google.com/spreadsheets/d/1EuH4lceMmlkfFtCqrn866dSfIEOfyfnfk2N0-qLWmbU/edit?usp=sharing';
  const res = await fetch(url);
  const html = await res.text();
  
  // Extract bootstrap data or sheet info
  const gidMatches = [...html.matchAll(/gid[=:]"?([0-9]+)/g)].map(m => m[1]);
  console.log('GIDs found:', [...new Set(gidMatches)]);

  // Look for sheet names in the HTML
  const nameMatches = [...html.matchAll(/"name":"([^"]+)"/g)].map(m => m[1]);
  console.log('Sheet Names:', nameMatches.slice(0, 20));
}

checkTabs().catch(console.error);
