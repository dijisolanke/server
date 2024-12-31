thank you, Lets begin to build this project step by step breaking each step to the smallest component. I will use language in relation to allegory in order to communicate from this point on.

Im ready to build the castle, I have a folder called server open in vs code, this is where i will build the castle. I need to know what tools and materials to begin building with

you'll need some magical building materials and enchanted tools. Here's what you should gather:

The Foundation Stone (Node.js): Open your terminal in VS Code Run npm init -y to create a magical blueprint (package.json)

#### Castle Walls (Express.js):✅

Install with npm install express This will form the sturdy structure of your castle

#### Magical Communication Mirrors (Socket.io):✅

Install with npm install socket.io These will allow instant communication throughout the castle

#### Enchanted Ledger (Database, e.g., MongoDB):✅

Install with npm install mongoose This will keep track of all your guests and their information

#### Security Spells (Authentication library, e.g., Passport.js):✅

Install with npm install passport passport-local These will ensure only invited guests can enter

#### Wizard's Scroll (Environment variables):✅

Install with npm install dotenv This will keep your magical secrets safe

Create the main entrance to your castle. In your server folder, create a file called server.js.

#### Create the Great Hall (Lobby System):✅

First, let's add some magical mirrors to our castle that will show all the guests in the Great Hall. In your server.js file, add:

#### Set up the Matchmaking Wizard (Signaling Server):✅

Now, let's add the Matchmaking Wizard to help guests connect with each other. Add this to your server.js:

### Enchant the Teleportation Crystals (STUN/TURN configuration):✅

Create a new file called magicConfig.js in your server folder
set up ice server(ATUN/TURN) credentials as exportable module

### Fair Play Spell (Matching Algorithm):✅

Let's create a new file called fairPlaySpell.js in your server folder:

### Create error handling module and integrate into server:✅

courtJester.js

### implement user authentication using JSON Web Tokens (JWT)

auth.js

## Steps complete

`npm init`

- Setup up Node js(Our castles Fondation)
  `npm install express`

- Setup socket.io (Magic communication mirrors)
  `npm install socket.io`

- Setup a Database (Enchanted ledger to keep track of guests)
  `npm install mongoose`

- Setup a way to ensure only invited guests can enter
  `npm install passport passport-local`

- Setup way to keep secrets safe(dotenv)
  `npm install dotenv`

- Create main entrance
  `touch server.js`

setup socket.io (for adding guests to lobby) with CORS origin configuration

- Set up behaviour protocols for when connection is made(when a magic mirror is looked through)

  - when looked through(socket on enter), the mirror is added to an array
  - when look away(socket on disconnect) the mirror is removed from array
  - When connecting with another mirror (socket on callGuest) search for next person in the array and tell them they have an incoming call. if no next person exits, tell me
  - if the next person accepts set both thee caller and person accepting's availabily status to false `guests.get(socket.id).available = false;` so they can no longer be reached by an new call request

- STUN/TURN credentials setup as exportable module (magicConfig.js)

- Setup matching algorithm (fairPlaySpell.js)

  - method to add guest to waiting list which is an array
  - method to remove user from waiting list
  - method to find a match (if waiting list isnt empty and the next waiting guest isn't user we're matching to, return that next guest else do nothing)

- Create a module to set up match making logic as a method(fairPlaySpell.js)

- Integrate the match making logic with the server

- Create a nodule to set up error handling (courtJester.js)

- Integrate the error handling with the server

- Create authentication process (auth.js)
  - use `jsonwebtoken` and `bycrypt` libraries for

Next steps:

- Implement Fair Play Spell (matching algorithm)
- Add Court Jester (error handling)
- Develop client-side React application
- Integrate WebRTC for peer-to-peer video connections
- Implement authentication system
