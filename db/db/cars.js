const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
app.use(cors());
app.use(express.json());

const dbpath = path.join(__dirname, "spinny.db");

let db;

const initializationDbandServer = async () => {
  db = await open({
    filename: dbpath,
    driver: sqlite3.Database,
  });

  console.log("db connected");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      price INTEGER,
      kms_driven INTEGER,
      fuel_type TEXT,
      transmission TEXT,
      category TEXT,

      owner_count INTEGER,
      body_type TEXT,
      registration_state TEXT,
      mileage REAL,
      engine_cc INTEGER,
      power_bhp INTEGER,
      torque_nm INTEGER,

      features TEXT,
      safety_features TEXT,
      comfort_features TEXT,
      infotainment_features TEXT,
      exterior_features TEXT,
      interior_features TEXT,

      service_history TEXT,
      tyre_condition TEXT,
      battery_health TEXT,
      insurance_valid_till TEXT,
      photos TEXT
    );
  `;
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL
  );`);
  await db.run(createTableQuery);
  console.log("Table created or already exists");

  const port = process.env.PORT || process.env.SERVER_PORT;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

initializationDbandServer();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  let token;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    next();
  });
};

// GET ALL CARS
app.get("/cars", async (req, res) => {
  try {
    const query = "SELECT * FROM cars;";
    const result = await db.all(query);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ "server error": err.message });
  }
});
// get a single car
app.get("/cars/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const car = await db.get("SELECT * FROM cars WHERE id = ?", [id]);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    } else {
      res.json(car);
    }
  } catch (err) {
    res.status(500).json("Server Error");
  }
});

// POST (ONE CAR)
app.post("/cars", authenticateToken, async (req, res) => {
  try {
    const c = req.body;

    const result = await db.run(
      `INSERT INTO cars 
      (
        name, brand, model, year, price, kms_driven, fuel_type, transmission, category,
        owner_count, body_type, registration_state, mileage, engine_cc, power_bhp, torque_nm,
        features, safety_features, comfort_features, infotainment_features,
        exterior_features, interior_features,
        service_history, tyre_condition, battery_health, insurance_valid_till, photos
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        c.name,
        c.brand,
        c.model,
        c.year,
        c.price,
        c.kms_driven,
        c.fuel_type,
        c.transmission,
        c.category,

        c.owner_count,
        c.body_type,
        c.registration_state,
        c.mileage,
        c.engine_cc,
        c.power_bhp,
        c.torque_nm,

        JSON.stringify(c.features || []),
        JSON.stringify(c.safety_features || []),
        JSON.stringify(c.comfort_features || []),
        JSON.stringify(c.infotainment_features || []),
        JSON.stringify(c.exterior_features || []),
        JSON.stringify(c.interior_features || []),

        JSON.stringify(c.service_history || []),
        JSON.stringify(c.tyre_condition || {}),
        JSON.stringify(c.battery_health || {}),
        c.insurance_valid_till,
        JSON.stringify(c.photos || []),
      ],
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE CAR
app.delete("/cars/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run("DELETE FROM cars WHERE id = ?", [id]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    res.json({ success: true, message: "Car deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BULK INSERT
app.post("/cars/bulk", async (req, res) => {
  try {
    const cars = req.body;

    if (!Array.isArray(cars)) {
      return res.status(400).json({
        success: false,
        message: "Expected an array",
      });
    }

    const insertQuery = `
      INSERT INTO cars 
      (
        name, brand, model, year, price, kms_driven, fuel_type, transmission, category,
        owner_count, body_type, registration_state, mileage, engine_cc, power_bhp, torque_nm,
        features, safety_features, comfort_features, infotainment_features,
        exterior_features, interior_features,
        service_history, tyre_condition, battery_health, insurance_valid_till, photos
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertPromises = cars.map((c) =>
      db.run(insertQuery, [
        c.name,
        c.brand,
        c.model,
        c.year,
        c.price,
        c.kms_driven,
        c.fuel_type,
        c.transmission,
        c.category,

        c.owner_count,
        c.body_type,
        c.registration_state,
        c.mileage,
        c.engine_cc,
        c.power_bhp,
        c.torque_nm,

        JSON.stringify(c.features || []),
        JSON.stringify(c.safety_features || []),
        JSON.stringify(c.comfort_features || []),
        JSON.stringify(c.infotainment_features || []),
        JSON.stringify(c.exterior_features || []),
        JSON.stringify(c.interior_features || []),

        JSON.stringify(c.service_history || []),
        JSON.stringify(c.tyre_condition || {}),
        JSON.stringify(c.battery_health || {}),
        c.insurance_valid_till,
        JSON.stringify(c.photos || []),
      ]),
    );

    await Promise.all(insertPromises);

    res.json({ success: true, inserted: cars.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/users/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const bcryptpass = await bcrypt.hash(password, 10);
    const checkuser = await db.get("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    if (checkuser) {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    } else {
      const result = await db.run(
        "INSERT INTO users (username,email,password) VALUES (?,?,?)",
        [username, email, bcryptpass],
      );
      res.status(201).json({ success: true, id: result.lastID });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/users/login", async (req, res) => {
  const { username, password } = req.body;
  const checkuser = await db.get("SELECT * FROM users WHERE username=?", [
    username,
  ]);
  if (!checkuser) {
    return res.status(400).json({ success: false, message: "User not found" });
  }
  const isPasswordValid = await bcrypt.compare(password, checkuser.password);
  if (!isPasswordValid) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid password" });
  }
  if (isPasswordValid === true) {
    const payload = { username: username };
    const jwt_token = jwt.sign(payload, process.env.JWT_SECRET_KEY);
    res.send({ jwt_token: jwt_token });
  }
});
