import OLCesium from './olcs/OLCesium.js';
import GaKmlSynchronizer from './olcs/GaKmlSynchronizer.js';
import GaRasterSynchronizer from './olcs/GaRasterSynchronizer.js';
import GaTileset3dSynchronizer from './olcs/GaTileset3dSynchronizer.js';
import GaVectorSynchronizer from './olcs/GaVectorSynchronizer.js';

export default OLCesium;

const olcs = window['olcs'] = {};
olcs.OLCesium = OLCesium;
olcs.GaKmlSynchronizer = GaKmlSynchronizer;
olcs.GaRasterSynchronizer = GaRasterSynchronizer;
olcs.GaTileset3dSynchronizer = GaTileset3dSynchronizer;
olcs.GaVectorSynchronizer = GaVectorSynchronizer;
