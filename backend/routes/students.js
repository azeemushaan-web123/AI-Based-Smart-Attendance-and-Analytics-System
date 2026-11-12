const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
router.use(auth);

// Create
router.post("/", async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// List (hasFace ke saath)
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNo: 1 }).lean();
    const out = students.map((s) => ({
      _id: s._id,
      name: s.name,
      rollNo: s.rollNo,
      course: s.course,
      year: s.year,
      email: s.email,
      hasFace: Array.isArray(s.faceEncoding) && s.faceEncoding.length > 0,
    }));
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update (face encoding yahan se overwrite na ho)
router.put("/:id", async (req, res) => {
  const { faceEncoding, ...rest } = req.body;
  const student = await Student.findByIdAndUpdate(req.params.id, rest, { new: true });
  res.json(student);
});

// Delete (attendance bhi hatao)
router.delete("/:id", async (req, res) => {
  await Attendance.deleteMany({ student: req.params.id });
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// Face register
router.post("/:id/face", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Photo required" });

    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: "face.jpg",
      contentType: req.file.mimetype,
    });

    const { data } = await axios.post(`${process.env.PYTHON_URL}/py/encode`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    await Student.findByIdAndUpdate(req.params.id, { faceEncoding: data.encoding });
    res.json({ message: "Face registered" });
  } catch (err) {
    console.log("FACE ERROR:", err.code, err.response?.data || err.message);
    const msg = err.response?.data?.detail || err.message || "Face not detected";
    res.status(400).json({ message: msg });
  }
});

module.exports = router;