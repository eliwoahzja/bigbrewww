import { liveConfigHandler } from '../server/workspace.mjs';

export default function handler(req, res) {
  return liveConfigHandler(req, res);
}
