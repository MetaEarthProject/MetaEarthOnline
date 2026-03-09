# Meta Earth Online

React + TypeScript + Vite MMO political strategy prototype with a built-in SVG world map.

## Stack used

- Frontend: React, Vite, TypeScript
- State: Zustand
- Map: Local SVG world map (`@svg-maps/world`) with in-app coloring and zoom

## Implemented gameplay systems

- Character RPG profile with roles:
  - Citizen, Soldier, Politician, Business Owner, Journalist
- Daily action loop:
  - work, train, campaign, trade, fight, vote, publish, rest
- Geopolitical map:
  - world country territories rendered in-app
  - region ownership and travel by clicking playable countries
- Politics:
  - party popularity/membership
  - create/join party
  - election cycle tick
- War:
  - attack neighboring regions
  - ownership transfer on victory
- Economy:
  - resource pools and money flow

## Run

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`

## Notes

- No Mapbox token or `.env` setup is required.
- This is a frontend simulation prototype, not yet server-authoritative MMO.
- Next backend phase can follow your planned stack: Supabase + PostgreSQL + NestJS WebSocket game server.
