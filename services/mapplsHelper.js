import { getElocFromAddress, getLatLngFromEloc } from '../api/mapplsApi';

export const getLatLngFromAddress = async (address) => {
  try {
    console.log('@@@@@@@ Received Address to find Lat Long : '+address);
    const eLoc = await getElocFromAddress(address);
    if (!eLoc) throw new Error('No eLoc found');
    const coords = await getLatLngFromEloc(eLoc);
    if (!coords) throw new Error(`No coordinates found for eLoc ${eLoc}`);
    console.log('@@@@@@@ Obtained Lat Long from Address : '+coords.latitude+' '+coords.longitude);
    return coords;
  } catch (err) {
    console.error('Failed to get coordinates from address:', err);
    return null;
  }
};
