let me;
let guests;
let shared;

let planet
let solarSystem;
let selectedPlanet
let backgroundStarsManager;
let flightImages = [];
let minimapImg = [];
let imagesLoaded = 0; // Counter to track loaded images
//let totalImages = 778;
let totalImages = 805;

const detailsLevel = {
  showStarSystem: true,
  showPlanet: true,
  showBackroundStarts: true,
  showGameAreaImage: true,
  showStarPlanetImages: true
}

const screenLayout = {
  screenWidth: 2400, // 2400
  screenHeight: 1200, // 1200
  startPlanetIndex: 3,
  diameterPlanet: 3800, //3838,  // 1500/3838 Must be the same as the actual size of the background image found in preload()
  cropWidth: 1200, // 1800
  cropHeight: 700, // 1200
  xGameArea: 600,
  yGameArea: 50,
};

const gameConstants = {
  bulletSpeed: 2,
  //canonTowerShootingInterval: 1000,
  diameterFlight: 200, // can be adjusted
  diameterBullet: 15,
  minimapMarkerDiamter: 10,
  shootingIntervals: {
    'Extreem (0.1s)': 100,
    'Very fast (0.3s)': 300,
    'Fast (0.5s)': 500,
    'Normal (1s)': 1000,
    'Slow (2s)': 2000,
    'Very Slow (3s)': 3000
  }
}
let meHost = false;
let counter = 0
let xText = 0;
let gameObjects = []; // Initialize as empty array
//let canonTowerCount = 5; // Store the previous tower count - Declare here

let flights = [];
let activeFlights = [];
const playerColors = ['green', 'blue', 'red', 'yellow', 'purple', 'orange', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'teal', 'lavender', 'maroon', 'olive']

function imageLoaded() {
  imagesLoaded++; // Increase count when an image is loaded
}
function setup() {
  createCanvas(screenLayout.screenWidth, screenLayout.screenHeight);

  planet = new BasicMinimap(x = 250, y = 250, diameter = 300, color = 'grey', diameterPlanet = screenLayout.diameterPlanet);

  solarSystem = new SolarSystem(xSolarSystemCenter = 1250, ySolarSystemCenter = 900);

  backgroundStarsManager = new BackgroundStarManager(numberOfBackgroundStarts = 300, screenLayout.screenWidth, screenLayout.screenHeight);

  createFlights();

  if (partyIsHost()) {
    meHost = true;
    updateTowerCount();
  }

  if (me.playerName === "observer") {
    joinGame();
    return;
  }
}

function onLocalScreenArea(xLocal, yLocal) {
  return xLocal >= 0 && xLocal <= screenLayout.cropWidth && yLocal >= 0 && yLocal <= screenLayout.cropHeight;
}

function updateTowerCount() {
  gameObjects = generateTowers(shared.canonTowerCount);
  shared.gameObjects = gameObjects.map(tower => ({
    xGlobal: tower.xGlobal,
    yGlobal: tower.yGlobal,
    diameter: tower.diameter,
    color: tower.color,
    bullets: [],
    angle: 0,
    hits: Array(15).fill(0),
    planetIndex: 0,
    lastShotTime: 0,
  }));
}

function generateTowers(count) {
  const towers = [];
  const radius = screenLayout.diameterPlanet / 12; // Distance from center 
  const angleStep = (2 * PI) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    const x = screenLayout.diameterPlanet / 2 + radius * cos(angle);
    const y = screenLayout.diameterPlanet / 2 + radius * sin(angle);

    towers.push(new Canon({
      objectNumber: i,
      objectName: `canon${i}`,
      xGlobal: x,
      yGlobal: y,
      diameter: 60,
      xSpawnGlobal: x,
      ySpawnGlobal: y,
      color: 'red',
    }));
  }
  return towers;
}
//s
function preload() {
  partyConnect("wss://p5js-spaceman-server-29f6636dfb6c.herokuapp.com", "jkv-spaceSV5j2");

  shared = partyLoadShared("shared", {
    gameObjects: [],  // Start with empty array
    canonTowerHits: Array(15).fill(0),
    canonTowerCount: 3,
    canonTowerShootingInterval: 1000,
  });
  me = partyLoadMyShared({ playerName: "observer" });
  guests = partyLoadGuestShareds();

  for (let i = 0; i < 13; i++) {
    flightImages[i] = loadImage(`images/flight/flight${i}.png`);
    //    flightImages[i] = loadImage(`images/boss1.png`);
  }
  for (let i = 0; i < totalImages; i++) {
    minimapImg[i] = loadImage(`images/planetA/planetAminimap2/planetA_${i}.png`, imageLoaded);
    //minimapImg[i] = loadImage(`images/planetA/planetAminimap/planetA_${i}.png`, imageLoaded);
  }
 
  /*
  for (let i = 0; i < 778; i++) {

    minimapImg[i] = loadImage(`images/planetA/planetAminimap/planetA_${i}.png`);
  }*/

  minimapImage = loadImage(`images/bgLavaMinimap.png`);
  //  minimapNightImage = loadImage(`images/background/bgMinimapNight.png`);
  //  minimapHotImage = loadImage(`images/background/bgMinimapHot.png`);
  //  backgroundImage = loadImage("images/background/bgLava3500.png");
  //  backgroundImage = loadImage("images/bgLava1500.png");
  backgroundImage = loadImage("images/planetA/planetA.png"); // Circle 3838, Image 4000
  //  backgroundImage = loadImage("images/planetA/planetAGlowingV1.png");// Circle 3838, Image 4000
  //  backgroundImage = loadImage("images/background/bgLava.png");
  //  backgroundNightImage = loadImage("images/background/bgNight.png");
  //  backgroundHotImage = loadImage("images/background/bgHot.png");
}

function draw() {

  if (!meHost && partyIsHost()) {
    meHost = true;
    updateTowerCount();
  }

  selectedPlanet = solarSystem.planets[me.planetIndex];
  activeFlights = flights.filter(f => f.planetIndex >= 0); // Only target visible flights - changed filter

  // Handle updates
  stepLocal();

  if (partyIsHost()) {
    performHostAction()
  } else {
    receiveNewDataFromHost()
  }

  if (detailsLevel.showBackroundStarts) {
    backgroundStarsManager.move();
  }

  if (me.playerName != "observer") {
    moveMe();
    checkCollisions();
  }


  // Draw screen
  background(0);

  if (detailsLevel.showBackroundStarts) {
    backgroundStarsManager.show();
  }

  if (detailsLevel.showStarSystem && imagesLoaded === totalImages) {
    push();
    angleMode(DEGREES);

    solarSystem.update();
    solarSystem.draw();
    pop()
    activeFlights.forEach((flight) => {
      if (flight.planetIndex >= 0) {
        selectedPlanet.drawFlight(flight);
      }
    });
  }
  angleMode(RADIANS);

  drawGameArea()

  if (detailsLevel.showPlanet) {
    planet.draw();

    activeFlights.forEach((flight) => {
      if (flight.planetIndex >= 0) {
        planet.drawObject(flight.xGlobal + flight.xLocal, flight.yGlobal + flight.yLocal, gameConstants.minimapMarkerDiamter, flight.color);
      }
    });
  }

  // Draw Canon Towers for all players
  gameObjects.forEach(canon => {
    canon.drawCanonTower();
    canon.drawBullets();
    canon.drawScore();
  });

  let offSetY = 500;
  if (partyIsHost()) {
    fill('gray')
    text("Host", 20, offSetY);
    offSetY += 20
  }
  textSize(18);
  let numberOfBullets = 0;
  let numberOfVisualBullets = 0;

  // Count visible bullets from flights
  activeFlights.forEach((flight) => {
    if (flight.planetIndex >= 0) {
      flight.drawScore(offSetY);
      offSetY += 20;
      numberOfBullets += flight.bullets.length;
      // Count visible bullets
      flight.bullets.forEach(bullet => {
        let xLocal = bullet.xLocal - (me.xGlobal - bullet.xGlobal);
        let yLocal = bullet.yLocal - (me.yGlobal - bullet.yGlobal);
        if (onLocalScreenArea(xLocal, yLocal)) {
          numberOfVisualBullets++;
        }
      });
    }
  });

  // Count visible bullets from canons
  gameObjects.forEach(canon => {
    numberOfBullets += canon.bullets.length;
    // Count visible bullets
    canon.bullets.forEach(bullet => {
      let xLocal = bullet.xGlobal - me.xGlobal;
      let yLocal = bullet.yGlobal - me.yGlobal;
      if (onLocalScreenArea(xLocal, yLocal)) {
        numberOfVisualBullets++;
      }
    });
  });

  fill('gray');
  text("Total number of bullets: " + numberOfBullets, 20, offSetY);
  offSetY += 20;
  text("Number of visible bullets: " + numberOfVisualBullets, 20, offSetY);
  offSetY += 40;
  text("Performance controls:", 20, offSetY);
  offSetY += 20;
  text("Key p: show star system ", 20, offSetY);
  offSetY += 20;
  text("Key o: show detailed minimap ", 20, offSetY);
  offSetY += 20;
  text("Key i: show background starts ", 20, offSetY);
  offSetY += 20;
  text("Key m: Expand game area right ", 20, offSetY);
  offSetY += 20;
  text("Key n: Expand game area down ", 20, offSetY);
  offSetY += 20;
  if (partyIsHost()) {
    text("Key 9, 8, 7, 6: NoOfCanons 18, 9, 3, 0 ", 20, offSetY);
    offSetY += 20;
    text("Key l, k, j: Shooting interval 500, 1000, 2000", 20, offSetY);
    offSetY += 20;
  }
}

function keyPressed() {

  if (keyCode === 49) { // 1
    me.planetIndex = 0;
  } else if (keyCode === 50) { // 2
    me.planetIndex = 1;
  } else if (keyCode === 51) { // 3
    me.planetIndex = 2;
  } else if (keyCode === 52) { // 4
    me.planetIndex = 3;
  } else if (keyCode === 53) { // 5
    me.planetIndex = 4;
  }

  if (keyCode === 80) { // p
    detailsLevel.showStarSystem = !detailsLevel.showStarSystem;
  }
  if (keyCode === 79) { // o
    detailsLevel.showPlanet = !detailsLevel.showPlanet;
  }
  if (keyCode === 73) { // i
    detailsLevel.showBackroundStarts = !detailsLevel.showBackroundStarts;
  }
  if (keyCode === 85) { // u
    detailsLevel.showGameAreaImage = !detailsLevel.showGameAreaImage;
  }
  if (keyCode === 89) { // y
    detailsLevel.showStarPlanetImages = !detailsLevel.showStarPlanetImages;
  }
  if (partyIsHost() && keyCode === 57) { // 9
    shared.canonTowerCount = 18;
    updateTowerCount();
  }
  if (partyIsHost() && keyCode === 56) { // 8
    shared.canonTowerCount = 9;
    updateTowerCount();
  }
  if (partyIsHost() && keyCode === 55) { // 7
    shared.canonTowerCount = 3;
    updateTowerCount();
  }
  if (partyIsHost() && keyCode === 54) { // 6
    shared.canonTowerCount = 0;
    updateTowerCount();
  }
  if (partyIsHost() && keyCode === 76) { // l
    shared.canonTowerShootingInterval = 500;
  }
  if (partyIsHost() && keyCode === 75) { // k
    shared.canonTowerShootingInterval = 1000;
  }
  if (partyIsHost() && keyCode === 74) { // j
    shared.canonTowerShootingInterval = 2000;
  }
  if (keyCode === 77) { // m
    if (screenLayout.cropWidth === 1200) {
      screenLayout.cropWidth = 1600;
    } else {
      screenLayout.cropWidth = 1200;
    }
  }
  if (keyCode === 78) { // n
    if (screenLayout.cropHeight === 700) {
      screenLayout.cropHeight = 1100;
      showStarSystem = false
    } else {
      screenLayout.cropHeight = 700;
      showStarSystem = true
    }
  }
}

function performHostAction() {
  gameObjects.forEach((canon, index) => {

    canon.move();

    const currentTime = millis();
    //        const selectedInterval = gameConstants.shootingIntervals[shootingIntervalSelect.value()];
    const selectedInterval = shared.canonTowerShootingInterval;
    // Check if selectedInterval is a valid number
    if (typeof selectedInterval === 'number') {
      if (currentTime - canon.lastShotTime > selectedInterval) {
        if (activeFlights.length > 0) {
          const nearestFlight = canon.findNearestFlight();

          if (nearestFlight) {
            canon.shoot(nearestFlight);
            canon.lastShotTime = currentTime;
          }
        }
      }
    } else {
      console.warn("Invalid shooting interval:", shootingIntervalSelect.value());
    }

    canon.moveBullets(); // Move bullets before drawing
    canon.checkCollisionsWithFlights();  // Add this line

    // Sync to shared state
    shared.gameObjects[index] = {
      ...shared.gameObjects[index],
      xGlobal: canon.xGlobal,
      yGlobal: canon.yGlobal,
      //          buls: JSON.parse(JSON.stringify(canon.buls)), // Deep copy
      bullets: canon.bullets, // Deep copyfhg
      angle: canon.angle,
      lastShotTime: canon.lastShotTime,
      hits: canon.hits, // Update shared state to include hits
    };
  });

  // Calculate total hits from canon towers for each player
  let totalCanonHits = Array(15).fill(0);
  gameObjects.forEach(canon => {
    for (let i = 0; i < totalCanonHits.length; i++) {
      totalCanonHits[i] += canon.hits[i];
    }
  });
  shared.canonTowerHits = totalCanonHits;
}

function receiveNewDataFromHost() {

  // Ensure client has same number of towers as host
  while (gameObjects.length < shared.gameObjects.length) {
    const i = gameObjects.length;
    gameObjects.push(new Canon({
      objectNumber: i,
      objectName: `canon${i}`,
      xGlobal: shared.gameObjects[i].xGlobal,
      yGlobal: shared.gameObjects[i].yGlobal,
      diamter: 60,
      color: 'grey',
      xSpawnGlobal: shared.gameObjects[i].xSpawnGlobal,
      ySpawnGlobal: shared.gameObjects[i].ySpawnGlobal
    }));
  }
  // Remove extra towers if host has fewer
  while (gameObjects.length > shared.gameObjects.length) {
    gameObjects.pop();
  }
  // Update existing towers
  gameObjects.forEach((canon, index) => {
    canon.diameter = shared.gameObjects[index].diameter;
    canon.color = shared.gameObjects[index].color;

    canon.xGlobal = shared.gameObjects[index].xGlobal;
    canon.yGlobal = shared.gameObjects[index].yGlobal;
    canon.bullets = shared.gameObjects[index].bullets;
    canon.angle = shared.gameObjects[index].angle;
    canon.lastShotTime = shared.gameObjects[index].lastShotTime; // Sync lastShotTime
    canon.hits = shared.gameObjects[index].hits || Array(15).fill(0);
  });
}

function drawGameArea() {

  if (detailsLevel.showGameAreaImage) {
    let cropX = me.xGlobal;
    let cropY = me.yGlobal;
    // Scale the background image to match planet size
    image(backgroundImage,
      screenLayout.xGameArea,
      screenLayout.yGameArea,
      screenLayout.cropWidth,
      screenLayout.cropHeight,
      cropX,
      cropY,
      screenLayout.cropWidth,
      screenLayout.cropHeight
    );
  } else {
    //    noFill();
    fill('grey')
    circle(screenLayout.xGameArea - me.xGlobal + planet.diameterPlanet / 2, screenLayout.yGameArea - me.yGlobal + planet.diameterPlanet / 2, planet.diameterPlanet);
    fill('black')
    rect(0, 0, screenLayout.xGameArea, screenLayout.screenHeight);
    rect(screenLayout.xGameArea + screenLayout.cropWidth, 0, screenLayout.screenWidth, screenLayout.screenHeight);
    rect(0, screenLayout.yGameArea + screenLayout.cropHeight, screenLayout.screenWidth, screenLayout.screenWidth);
  }
  activeFlights.forEach((flight) => {
    if (flight.planetIndex >= 0) {
      flight.drawFlight();
      flight.drawBullets()
    }
  });
}

function moveMe() {

  // Local movement (game area)
  let localOffX = 0;
  let localOffY = 0;
  const localSpeed = 3;
  if (keyIsDown(70)) { localOffX = -localSpeed } // F
  if (keyIsDown(72)) { localOffX = localSpeed }  // H
  if (keyIsDown(84)) { localOffY = -localSpeed } // T
  if (keyIsDown(71)) { localOffY = localSpeed }  // G

  // Global movement (planet)
  const globalSpeed = 6;
  let gOffX = 0, gOffY = 0;
  if (keyIsDown(65)) { gOffX = -globalSpeed } // A
  if (keyIsDown(68)) { gOffX = globalSpeed }  // D
  if (keyIsDown(87)) { gOffY = -globalSpeed } // W
  if (keyIsDown(83)) { gOffY = globalSpeed }  // S

  let xTemp = me.xLocal + localOffX;
  let yTemp = me.yLocal + localOffY;
  let newxGlobal = me.xGlobal + gOffX;
  let newyGlobal = me.yGlobal + gOffY;

  // Keep local position within screen bounds
  xTemp = constrain(xTemp, 0, screenLayout.cropWidth);
  yTemp = constrain(yTemp, 0, screenLayout.cropHeight);

  // Keep global position within planet bounds
  newxGlobal = constrain(newxGlobal, 0, planet.diameterPlanet);
  newyGlobal = constrain(newyGlobal, 0, planet.diameterPlanet);

  if (selectedPlanet.onPlanet(xTemp + newxGlobal, yTemp + newyGlobal)) {
    me.xGlobal = newxGlobal;
    me.yGlobal = newyGlobal;
    me.xLocal = xTemp;
    me.yLocal = yTemp;
  }
  /*
    if (planet.isOnPlanet(xTemp + newxGlobal, yTemp + newyGlobal)) {
      me.xGlobal = newxGlobal;
      me.yGlobal = newyGlobal;
      me.xLocal = xTemp;
      me.yLocal = yTemp;
    }
      */

  me.xMouse = mouseX - screenLayout.xGameArea;
  me.yMouse = mouseY - screenLayout.yGameArea;


  for (let i = me.bullets.length - 1; i >= 0; i--) {
    let bullet = me.bullets[i];
    let bulletVector = createVector(
      int(bullet.xMouseStart) - bullet.xStart,
      int(bullet.yMouseStart) - bullet.yStart,
    ).normalize();
    bullet.xLocal += bulletVector.x * parseInt(gameConstants.bulletSpeed);
    bullet.yLocal += bulletVector.y * parseInt(gameConstants.bulletSpeed);

    // Update global coordinates
    bullet.xGlobal += bulletVector.x * parseInt(gameConstants.bulletSpeed);
    bullet.yGlobal += bulletVector.y * parseInt(gameConstants.bulletSpeed);

    let xLocalTemp = bullet.xLocal - (me.xGlobal - bullet.xGlobal);
    let yLocalTemp = bullet.yLocal - (me.yGlobal - bullet.yGlobal);

    // Remove bullet if it's not on the screen seen from the flight shooting it
    if (!selectedPlanet.onPlanet(bullet.xLocal + bullet.xGlobal, bullet.yLocal + bullet.yGlobal)

      || !onLocalScreenArea(xLocalTemp, yLocalTemp)) {
      me.bullets.splice(i, 1);
    }
  }
}

function checkCollisions() {

  activeFlights.forEach((flight) => {
    if (flight.playerName != me.playerName) {
      checkCollisionsWithFlight(flight);
    }
  });
}

function checkCollisionsWithFlight(flight) {
  for (let i = me.bullets.length - 1; i >= 0; i--) {
    let bullet = me.bullets[i];

    // Calculate bullet's position relative to the flight
    let bulletPosX = bullet.xLocal - (me.xGlobal - bullet.xGlobal);
    let bulletPosY = bullet.yLocal - (me.yGlobal - bullet.yGlobal);

    // Calculate flight's position relative to the bullet
    let flightPosX = flight.xLocal - (me.xGlobal - flight.xGlobal);
    let flightPosY = flight.yLocal - (me.yGlobal - flight.yGlobal);

    let d = dist(flightPosX, flightPosY, bulletPosX, bulletPosY);

    if (d < (flight.diameter + gameConstants.diameterBullet) / 2) {
      me.hits[flight.playerNumber]++;
      me.bullets.splice(i, 1);
    }
  }
}

function stepLocal() {

  flights.forEach(flight => {
    const guest = guests.find((p) => p.playerName === flight.playerName);
    if (guest) {
      flight.syncFromShared(guest);
    } else {
      flight.planetIndex = -1;
    }
  });

}

function mousePressed() {

  if (me.playerName === "observer" || me.bullets.length > 5)
    return

  let bullet = {
    xLocal: me.xLocal,
    yLocal: me.yLocal,
    xStart: me.xLocal,
    yStart: me.yLocal,
    xMouseStart: me.xMouse,
    yMouseStart: me.yMouse,
    xGlobal: me.xGlobal,
    yGlobal: me.yGlobal,
  };
  me.bullets.push(bullet);
}


function createFlights() {
  for (let i = 0; i < 2; i++) {
    flights.push(new Flight({
      playerNumber: i,
      playerName: "player" + i,
      teamNumber: 0,
      xLocal: screenLayout.cropWidth / 2 + 100,
      yLocal: screenLayout.cropHeight / 2,
      xGlobal: screenLayout.diameterPlanet / 2 - screenLayout.cropWidth / 2 + 400,
      yGlobal: screenLayout.diameterPlanet / 2 - screenLayout.cropHeight / 2,
      diameter: gameConstants.diameterFlight,
      xMouse: 0,
      yMouse: 0,
      color: playerColors[i % playerColors.length],
      bullets: [],
      hits: Array(15).fill(0),
      planetIndex: -1,
    }));
  }
}

function joinGame() {

  // don't let current players double join
  if (me.playerName.startsWith("player")) return;

  for (let flight of flights) {
    if (!guests.find((p) => p.playerName === flight.playerName)) {
      spawn(flight);
      return;
    }
  }
}

function watchGame() {
  me.playerName = "observer";
}

function spawn(flight) {
  me.playerNumber = flight.playerNumber;
  me.playerName = flight.playerName;
  me.xLocal = flight.xLocal;
  me.yLocal = flight.yLocal;
  me.xGlobal = flight.xGlobal;
  me.yGlobal = flight.yGlobal;
  me.diameter = flight.diameter;
  me.color = flight.color;
  me.bullets = [];
  me.hits = Array(15).fill(0)
  me.planetIndex = screenLayout.startPlanetIndex;
}
