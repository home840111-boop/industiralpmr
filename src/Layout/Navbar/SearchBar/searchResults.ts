import { SearchResult } from ".";

function search(
  results: SearchResult[],
  searchTerm: string,
) {
  const search = searchTerm.toLowerCase();
  const threshold = search.length >= 4 ? 1 : 0;

  const matchedResults = results.filter((result) => {
    const lowercaseTitle = result.title.toLowerCase();
    const lowercasePath = result.path.toLowerCase();

    const titleDistance = calculateLevenshteinDistance(search, lowercaseTitle);
    const pathDistance = calculateLevenshteinDistance(search, lowercasePath);

    return titleDistance <= threshold || pathDistance <= threshold;
  });

  const sortedResults = matchedResults.sort((a, b) => {
    const aTitleDistance = calculateLevenshteinDistance(
      search,
      a.title.toLowerCase(),
    );
    const aPathDistance = calculateLevenshteinDistance(
      search,
      a.path.toLowerCase(),
    );

    const bTitleDistance = calculateLevenshteinDistance(
      search,
      b.title.toLowerCase(),
    );
    const bPathDistance = calculateLevenshteinDistance(
      search,
      b.path.toLowerCase(),
    );

    const aMinDistance = Math.min(aTitleDistance, aPathDistance);
    const bMinDistance = Math.min(bTitleDistance, bPathDistance);

    return aMinDistance - bMinDistance;
  });

  return sortedResults;
}

function calculateLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let minDistance = Infinity;

  for (let i = 0; i <= b.length - a.length; i++) {
    let distance = 0;

    for (let j = 0; j < a.length; j++) {
      if (a.charAt(j) !== b.charAt(i + j)) {
        distance++;
      }
    }

    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}


export default search;
