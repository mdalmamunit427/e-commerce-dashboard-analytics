# e-commerce-dashboard-analytics
![](/github-cover.png)

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- Node.js (v14 or higher)
- npm (v6 or higher) or yarn (v1.22 or higher)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/mdalmamunit427/e-commerce-dashboard-analytics.git
   cd e-commerce-dashboard-analytics
   ```

2. Install dependencies for the client:
   ```sh
   cd client
   npm install
   # or
   yarn install
   ```

3. Install dependencies for the server:
   ```sh
   cd ../server
   npm install
   # or
   yarn install
   ```

### Running the Project

1. Start the server:
   ```sh
   cd server
   npm start
   # or
   yarn start
   ```

2. In a new terminal, start the client:
   ```sh
   cd client
   npm run dev
   # or
   yarn dev
   ```

### Building for Production

1. Build the client:
   ```sh
   cd client
   npm run build
   # or
   yarn build
   ```

2. The production-ready files will be in the `client/dist` directory.

### Additional Scripts

- Lint the client code:
  ```sh
  cd client
  npm run lint
  # or
  yarn lint
  ```

- Preview the client build:
  ```sh
  cd client
  npm run preview
  # or
  yarn preview
  ```

### Environment Variables

The server uses environment variables for configuration. Create a `.env` file in the `server` directory and add your variables there. For example:

