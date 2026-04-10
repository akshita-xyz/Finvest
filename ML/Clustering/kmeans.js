function initializeCentroids(data, k) {
  const centroids = [];
  const usedIndices = new Set();
  
  const randomIndex = Math.floor(Math.random() * data.length);
  centroids.push([...data[randomIndex]]);
  usedIndices.add(randomIndex);
  
  for (let i = 1; i < k; i++) {
    const distances = data.map((point, idx) => {
      if (usedIndices.has(idx)) return 0;
      const minDist = Math.min(...centroids.map(c => euclideanDistance(point, c)));
      return minDist;
    });
    
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalDist;
    
    for (let j = 0; j < distances.length; j++) {
      random -= distances[j];
      if (random <= 0 && !usedIndices.has(j)) {
        centroids.push([...data[j]]);
        usedIndices.add(j);
        break;
      }
    }
  }
  
  return centroids;
}

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

function assignClusters(data, centroids) {
  return data.map(point => {
    let minDist = Infinity;
    let cluster = 0;
    
    centroids.forEach((centroid, idx) => {
      const dist = euclideanDistance(point, centroid);
      if (dist < minDist) {
        minDist = dist;
        cluster = idx;
      }
    });
    
    return cluster;
  });
}

function updateCentroids(data, clusters, k) {
  const newCentroids = [];
  
  for (let i = 0; i < k; i++) {
    const clusterPoints = data.filter((_, idx) => clusters[idx] === i);
    
    if (clusterPoints.length === 0) {
      newCentroids.push(centroids[i] || data[Math.floor(Math.random() * data.length)]);
    } else {
      const centroid = clusterPoints[0].map((_, dim) => 
        clusterPoints.reduce((sum, p) => sum + p[dim], 0) / clusterPoints.length
      );
      newCentroids.push(centroid);
    }
  }
  
  return newCentroids;
}

function kmeans(data, k = 4, maxIterations = 100, tolerance = 0.0001) {
  if (data.length === 0) return { clusters: [], centroids: [] };
  if (data.length < k) k = data.length;
  
  let centroids = initializeCentroids(data, k);
  let clusters = assignClusters(data, centroids);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const newCentroids = updateCentroids(data, clusters, k);
    const newClusters = assignClusters(data, newCentroids);
    
    const movement = centroids.reduce((sum, c, i) => 
      sum + euclideanDistance(c, newCentroids[i]), 0
    );
    
    centroids = newCentroids;
    clusters = newClusters;
    
    if (movement < tolerance) break;
  }
  
  return { clusters, centroids };
}

function getClusterStats(clusters, data, featureNames) {
  const stats = {};
  
  for (let i = 0; i < Math.max(...clusters) + 1; i++) {
    const clusterPoints = data.filter((_, idx) => clusters[idx] === i);
    
    if (clusterPoints.length > 0) {
      const centroid = centroids[i];
      stats[`cluster_${i}`] = {
        size: clusterPoints.length,
        percentage: (clusterPoints.length / data.length * 100).toFixed(1),
        centroid: featureNames 
          ? Object.fromEntries(featureNames.map((name, idx) => [name, centroid[idx]]))
          : centroid
      };
    }
  }
  
  return stats;
}

const centroids = [];

module.exports = {
  kmeans,
  euclideanDistance,
  initializeCentroids,
  assignClusters,
  updateCentroids,
  getClusterStats
};
