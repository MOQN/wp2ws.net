import '../../../loading.js';
import { World } from './World.js';

const app = document.querySelector('#app');
const world = new World(app);
world.start();
