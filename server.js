require('./start.js');
require('./admin-comment-fix.js');
require('./problem-bank-student-context-fix.js');

const express=require("express");
const session=require("express-session");
const PgSession=require("connect-pg-simple")(session);
const bcrypt=require("bcryptjs");
const {Pool}=require("pg");
const multer=require("multer");
const path=require("path"),fs=require("fs");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;

if(!process.env.DATABASE_URL){
  console.error("DATABASE_URL is required. Create a Render Postgres database and connect it to this service.");
  process.exit(1);
}

