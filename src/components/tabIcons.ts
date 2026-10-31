import { clipboard } from 'ionicons/icons';

const svg = (body: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`
  )}`;

export const sheetIcon = clipboard;

export const brickStackIcon = svg(
  '<rect x="48" y="64" width="192" height="80" rx="8"/><rect x="272" y="64" width="192" height="80" rx="8"/>' +
    '<rect x="160" y="176" width="192" height="80" rx="8"/><rect x="48" y="288" width="192" height="80" rx="8"/>' +
    '<rect x="272" y="288" width="192" height="80" rx="8"/><rect x="160" y="400" width="192" height="64" rx="8"/>'
);

export const truckIcon = svg(
  '<path d="M32 112a24 24 0 0 1 24-24h256a24 24 0 0 1 24 24v40h56a24 24 0 0 1 19 9l56 72a24 24 0 0 1 5 15v84a24 24 0 0 1-24 24h-24a64 64 0 0 1-128 0H212a64 64 0 0 1-128 0H56a24 24 0 0 1-24-24Zm336 88v56h92l-44-56ZM148 392a32 32 0 1 0 0 64 32 32 0 0 0 0-64Zm216 0a32 32 0 1 0 0 64 32 32 0 0 0 0-64Z" fill-rule="evenodd"/>'
);
