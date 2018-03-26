'use strict';

// Parameters
var generations;
var populationSize;
var momentumF; // amplifies movement to a particle's previous direction
var cognitiveF; // amplifies movement to a particle's best position
var socialF; // amplifies movement to a particle's best neighbour
var totalF; // sum of the other factors
var dimensions;
var dimensionsSizes = [];

// Additional parameters
var divisionF = 2; // how fast to slow down
var replacementF = 0.12; // the % of particles to replace

// Data points
var dataRoot;
var swarm;
var bestParticle;
var bestFitness;
var currentFitness;

// For the chart
var minChart = null;
var bestChart = null;

// Where everything begins
function initialize() {
  initializeChart();
  initializeParameters();

  // get raw data
  let inputData = $('#input_data')
    .val()
    .replace(/\n/g, ' ')
    .split(' ')
    .filter(x => x != '');
  console.log('raw data: ' + inputData);
  // first number represents the nr of dimensions
  dimensions = parseInt(inputData[0]);
  // numbers after that represent the size of every dimension
  for (let i = 1; i <= dimensions; i++) {
    dimensionsSizes.push(parseInt(inputData[i]));
  }
  console.log('dimensions: ' + dimensions);
  console.log('dimensions: ' + dimensionsSizes);

  // construct data graph
  dataRoot = new Node(null);
  let queue = [dataRoot];
  let dimension = 0;
  let remainingNodes = 1;
  let index = dimensions;
  let node;
  while (queue.length > 0 && dimension < dimensions) {
    // get first in queue
    node = queue.shift();
    remainingNodes--;

    let dsize = dimensionsSizes[dimension];
    // add nodes for the next dimension
    if (dimension != dimensions - 1) {
      for (let i = 0; i < dsize; i++) {
        node.add();
        queue.push(node.children[i]);
      }

      // when finishing a level, go to the next dimension
      if (remainingNodes == 0) {
        remainingNodes = dimensionsSizes[dimension];
        dimension++;
      }
      // if terminal, add values
    } else {
      let state;
      for (let i = 0; i < dsize; i++) {
        index++;
        state = parseFloat(inputData[index]);
        node.children.push(state);
      }
    }
  }
  console.log('data tree:');
  console.log(dataRoot);

  generatePopulation(generateParticle);
  while (generations > 0) {
    newGeneration();
  }
}

// For function part
function initializeForFunction() {
  initializeChart();
  initializeParameters();

  dimensions = 2;
  dimensionsSizes = [510.12, 510.12];
  console.log('dimensions: ' + dimensions);
  console.log('dimensions: ' + dimensionsSizes);

  generatePopulation(generateParticleForFunction);
  while (generations > 0) {
    newGenerationForFunction();
  }
}

function initializeParameters() {
  generations = parseInt($('#generations').val());
  console.log('generations: ' + generations);
  populationSize = parseInt($('#population_size').val());
  console.log('populationSize: ' + populationSize);
  momentumF = parseFloat($('#momentum_factor').val());
  console.log('momentumF: ' + momentumF);
  cognitiveF = parseFloat($('#cognitive_factor').val());
  console.log('cognitiveF: ' + cognitiveF);
  socialF = parseFloat($('#social_factor').val());
  console.log('socialF: ' + socialF);
  totalF = (momentumF + cognitiveF + socialF) / divisionF;
  console.log('totalF: ' + totalF);
  dimensionsSizes = [];
}

// Custom graph Nodes for retaining n-dimensional input data
// We create a Tree where each lever represents a dimension
// A 2 x 3 array would be represented as a Tree where
// 1) the root has 2 sons
// 2) each son has 3 leafes
function Node(parent) {
  this.parent = parent;
  this.children = [];
}

Node.prototype.add = function() {
  this.children.push(new Node(this));
};

// Function to get the value of a node
function getPositionValue(position) {
  let node = dataRoot;
  // get to the last node
  for (let i = 0; i < dimensions; i++) {
    node = node.children[parseInt(position[i], 2)];
  }
  // the last node holds the value at that position
  return node;
}

// Function for representing n-dimensional function data
// Using De Jong's function 1
function aFunction(x) {
  return x.reduce((x1, x2) => x1 + x2 * x2, 0);
}

// Custom Swarm Particle
// Starts in a random position
// With a random velocity
// Remembers it's best position and fitness
// Has a fitness, how good it is performing
// Has a dispersion, how far it is from the rest of the swarm(to avoid local minimum)
function Particle(initialPosition, initialVelocity) {
  this.position = initialPosition;
  this.velocity = initialVelocity;
  this.bestPosition = null;
  this.bestFitness = null;
  this.fitness = 0;
  this.dispersion = 0;
}

function generateParticle() {
  // initialize random starting position and velocity
  let limit;
  let position = [];
  let velocity = [];
  let p;
  let v;
  for (let i = 0; i < dimensions; i++) {
    limit = dimensionsSizes[i];
    p = Math.floor(Math.random() * limit).toString(2); // initial position must be within bounds
    v = (Math.floor(Math.random() * limit) - parseInt(p, 2)).toString(2); // initial velocity as change in position
    position.push(p);
    velocity.push(v);
  }
  // create a new Particle
  return new Particle(position, velocity);
}

// For function part
function generateParticleForFunction() {
  // initialize random starting position and velocity
  let limit;
  let position = [];
  let velocity = [];
  let p;
  let v;
  for (let i = 0; i < dimensions; i++) {
    limit = dimensionsSizes[i];
    p = Math.random() * limit; // initial position must be within bounds
    v = Math.random() * limit - p; // initial velocity as change in position
    position.push(p);
    velocity.push(v);
  }
  // create a new Particle
  return new Particle(position, velocity);
}

function generatePopulation(particleFunction) {
  swarm = [];
  bestParticle = null;
  bestFitness = null;
  for (let i = populationSize; i--; ) {
    swarm.push(particleFunction());
  }
  let initialSwarm = JSON.parse(JSON.stringify(swarm));
  console.log('initial swarm: ');
  console.log(initialSwarm);
}

function newGeneration() {
  generations = generations - 1;

  attributeFitness(getPositionValue);
  addDataToChart();
  moveSwarm();
  replaceWeakParticles(generateParticle);

  let currentSwarm = JSON.parse(JSON.stringify(swarm));
  console.log('swarm:');
  console.log(currentSwarm);
}

// For function part
function newGenerationForFunction() {
  generations = generations - 1;

  attributeFitness(aFunction);
  addDataToChart();
  moveSwarmForFunction();
  replaceWeakParticles(generateParticleForFunction);

  let currentSwarm = JSON.parse(JSON.stringify(swarm));
  console.log('swarm:');
  console.log(currentSwarm);
}

// in this case, the lower the fitness the better(it's a minimum problem)
function attributeFitness(fitnessFunction) {
  bestParticle = null;
  let particle;
  let fitness;
  let position;
  let node;
  for (let i = populationSize; i--; ) {
    particle = swarm[i];
    position = particle.position;
    fitness = fitnessFunction(position);
    particle.fitness = fitness;
  }

  // sort particles by fitness
  swarm.sort((p1, p2) => p1.fitness - p2.fitness);

  particle = swarm[0];
  fitness = particle.fitness;
  if (bestParticle == null || fitness < bestParticle.fitness) {
    bestParticle = particle;
    currentFitness = fitness;
  }
  if (bestFitness == null || fitness < bestFitness) {
    bestFitness = fitness;
  }

  let currentBestParticle = JSON.parse(JSON.stringify(bestParticle));
  console.log('best particle:');
  console.log(currentBestParticle);
}

function moveSwarm() {
  let particle;
  let position, previousPosition;
  let velocity, previousV, cognitiveV, socialV;
  let limit;
  for (let i = populationSize; i--; ) {
    particle = swarm[i];
    previousPosition = particle.position.slice(); // keep for best position
    // get cognitive and social directions for each dimension
    for (let j = 0; j < dimensions; j++) {
      previousV = parseInt(particle.velocity[j], 2);

      // in case the particle has no previous position
      if (particle.bestPosition == null) {
        cognitiveV = 0;
      } else {
        // the chage in position from the current to the best position of this particle
        cognitiveV =
          parseInt(particle.bestPosition[j], 2) -
          parseInt(particle.position[j], 2);
      }

      // the chage in position from the current position to the best global position
      socialV =
        parseInt(bestParticle.position[j], 2) -
        parseInt(particle.position[j], 2);

      // calculate velocity
      velocity = Math.floor(
        (momentumF * previousV + cognitiveF * cognitiveV + socialF * socialV) /
          totalF
      );
      position = parseInt(particle.position[j], 2);
      limit = dimensionsSizes[j] - 1;
      if (position + velocity > limit) {
        velocity = limit - position;
      } else if (position + velocity < 0) {
        velocity = -position;
      }
      // update velocity
      particle.velocity[j] = velocity.toString(2);
      // update position
      particle.position[j] = (position + velocity).toString(2);
    }

    // update best position and fitness of the particle
    if (
      particle.bestFitness == null ||
      particle.fitness < particle.bestFitness
    ) {
      particle.bestFitness = particle.fitness;
      particle.bestPosition = previousPosition;
    }
  }
}

// For function part
function moveSwarmForFunction() {
  let particle;
  let position, previousPosition;
  let velocity, previousV, cognitiveV, socialV;
  let limit;
  for (let i = populationSize; i--; ) {
    particle = swarm[i];
    previousPosition = particle.position.slice(); // keep for best position
    // get cognitive and social directions for each dimension
    for (let j = 0; j < dimensions; j++) {
      previousV = particle.velocity[j];

      // in case the particle has no previous position
      if (particle.bestPosition == null) {
        cognitiveV = 0;
      } else {
        // the chage in position from the current to the best position of this particle
        cognitiveV = particle.bestPosition[j] - particle.position[j];
      }

      // the chage in position from the current position to the best global position
      socialV = bestParticle.position[j] - particle.position[j];

      // calculate velocity
      velocity = Math.floor(
        (momentumF * previousV + cognitiveF * cognitiveV + socialF * socialV) /
          totalF
      );
      position = particle.position[j];
      limit = dimensionsSizes[j] - 1;
      if (position + velocity > limit) {
        velocity = limit - position;
      } else if (position + velocity < 0) {
        velocity = -position;
      }
      // update velocity
      particle.velocity[j] = velocity;
      // update position
      particle.position[j] = position + velocity;
    }

    // update best position and fitness of the particle
    if (
      particle.bestFitness == null ||
      particle.fitness < particle.bestFitness
    ) {
      particle.bestFitness = particle.fitness;
      particle.bestPosition = previousPosition;
    }
  }
}

function replaceWeakParticles(particleFunction) {
  let particlesToReplace = Math.floor(populationSize * (1 - replacementF));
  for (let i = populationSize - 1; i >= particlesToReplace; i--) {
    swarm[i] = particleFunction();
  }
}

// Chart functions
function addDataToChart() {
  minChart.data.labels.push('');
  minChart.data.datasets.forEach(dataset => {
    dataset.data.push(bestFitness);
  });
  minChart.update();

  bestChart.data.labels.push('');
  bestChart.data.datasets.forEach(dataset => {
    dataset.data.push(currentFitness);
  });
  bestChart.update();
}

function initializeChart() {
  if (minChart != null) minChart.destroy();
  if (bestChart != null) bestChart.destroy();
  minChart = new Chart(
    document.getElementById('minimum-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Minimum',
            data: [],
            backgroundColor: ['rgba(54, 142, 160, 0.2)'],
            borderColor: ['rgba(54, 142, 160, 1)'],
            borderWidth: 1
          }
        ]
      },
      options: {}
    }
  );
  bestChart = new Chart(
    document.getElementById('best-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Fitness of the best particle',
            data: [],
            backgroundColor: ['rgba(54, 142, 60, 0.2)'],
            borderColor: ['rgba(54, 142, 60, 1)'],
            borderWidth: 1
          }
        ]
      },
      options: {}
    }
  );
}

// Main
$('document').ready(function() {
  $('#start').on('click', initialize);
  $('#start-function').on('click', initializeForFunction);
  initializeChart();
});
