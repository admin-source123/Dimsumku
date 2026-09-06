const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "dimsumku.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT UNIQUE NOT NULL,
 password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 type TEXT NOT NULL CHECK(type IN ('income','expense')),
 name TEXT NOT NULL,
 amount REAL NOT NULL,
 category TEXT,
 date TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS productions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product TEXT NOT NULL,
 qty INTEGER NOT NULL,
 material REAL NOT NULL DEFAULT 0,
 labor REAL NOT NULL DEFAULT 0,
 overhead REAL NOT NULL DEFAULT 0,
 date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 price REAL NOT NULL
);
`);

if (!db.prepare("SELECT 1 FROM users LIMIT 1").get()) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users(username,password) VALUES(?,?)").run("admin", hash);
}
if (!db.prepare("SELECT 1 FROM products LIMIT 1").get()) {
  const ins = db.prepare("INSERT INTO products(name,price) VALUES(?,?)");
  [["Dimsum Ayam",1500],["Dimsum Udang",1700],["Dimsum Sayur",1300],["Dimsum Mix",1600]].forEach(x=>ins.run(...x));
  const income = db.prepare("INSERT INTO transactions(type,name,amount,category,date) VALUES(?,?,?,?,?)");
  income.run("income","Penjualan Dimsum (500 pcs)",2000000,"Penjualan","2026-09-08");
  income.run("income","Pesanan Catering (200 pcs)",800000,"Catering","2026-09-08");
  income.run("expense","Ayam 10 kg",500000,"Bahan Baku","2026-09-08");
  income.run("expense","Gaji Karyawan",750000,"Tenaga Kerja","2026-09-08");
  income.run("expense","Kulit Dimsum 5 kg",150000,"Bahan Baku","2026-09-08");
  db.prepare("INSERT INTO productions(product,qty,material,labor,overhead,date) VALUES(?,?,?,?,?,?)")
    .run("Dimsum Ayam",1500,1800000,750000,650000,"2026-09-08");
}

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "ganti-secret-anda",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));
app.use(express.static(path.join(__dirname,"public")));

function auth(req,res,next){ if(!req.session.user) return res.status(401).json({error:"Belum login"}); next(); }

app.post("/api/login",(req,res)=>{
  const {username,password}=req.body||{};
  const u=db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if(!u || !bcrypt.compareSync(password,u.password)) return res.status(401).json({error:"Username atau password salah"});
  req.session.user={id:u.id,username:u.username}; res.json({username:u.username});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));

app.get("/api/data",auth,(req,res)=>{
  const income=db.prepare("SELECT * FROM transactions WHERE type='income' ORDER BY date DESC,id DESC").all();
  const expense=db.prepare("SELECT * FROM transactions WHERE type='expense' ORDER BY date DESC,id DESC").all();
  const productions=db.prepare("SELECT * FROM productions ORDER BY date DESC,id DESC").all();
  const products=db.prepare("SELECT * FROM products ORDER BY id").all();
  res.json({income,expense,productions,products});
});
app.post("/api/transactions",auth,(req,res)=>{
  const {type,name,amount,category,date}=req.body;
  if(!["income","expense"].includes(type)||!name||!Number(amount)||!date) return res.status(400).json({error:"Data tidak lengkap"});
  const r=db.prepare("INSERT INTO transactions(type,name,amount,category,date) VALUES(?,?,?,?,?)").run(type,name,Number(amount),category||"",date);
  res.json({id:r.lastInsertRowid});
});
app.delete("/api/transactions/:id",auth,(req,res)=>{db.prepare("DELETE FROM transactions WHERE id=?").run(req.params.id);res.json({ok:true})});
app.post("/api/productions",auth,(req,res)=>{
  const {product,qty,material,labor,overhead,date}=req.body;
  if(!product||!Number(qty)||!date) return res.status(400).json({error:"Data produksi tidak lengkap"});
  const r=db.prepare("INSERT INTO productions(product,qty,material,labor,overhead,date) VALUES(?,?,?,?,?,?)")
    .run(product,Number(qty),Number(material||0),Number(labor||0),Number(overhead||0),date);
  res.json({id:r.lastInsertRowid});
});
app.delete("/api/productions/:id",auth,(req,res)=>{db.prepare("DELETE FROM productions WHERE id=?").run(req.params.id);res.json({ok:true})});
app.post("/api/products",auth,(req,res)=>{
  const {name,price}=req.body;
  if(!name||!Number(price)) return res.status(400).json({error:"Data produk tidak lengkap"});
  const r=db.prepare("INSERT INTO products(name,price) VALUES(?,?)").run(name,Number(price));res.json({id:r.lastInsertRowid});
});

app.listen(PORT,()=>console.log(`DimsumKu berjalan di http://localhost:${PORT}`));
