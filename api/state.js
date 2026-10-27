import { liveStateHandler } from '../server/workspace.mjs';

export const config = { maxDuration: 30 };

export default function handler(req, res) {
  return liveStateHandler(req, res);
}
