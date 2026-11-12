const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);
const upload = multer({ storage: multer.memoryStorage() });

const today = () => new Date().toISOString().slice(0, 10);

// Camera photo se attendance lagao
router.post("/scan", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Photo required" });

    const students = await Student.find({ "faceEncoding.0": { $exists: true } });
    if (students.length === 0)
      return res.status(400).json({ message: "No registered faces" });

    const list = students.map((s) => ({ id: String(s._id), encoding: s.faceEncoding }));

    const form = new FormData();
    form.append("file", req.file.buffer, { filename: "scan.jpg", contentType: req.file.mimetype });
    form.append("students", JSON.stringify(list));

    const { data } = await axios.post(`${process.env.PYTHON_URL}/py/recognize`, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    if (!data.matched) return res.json({ matched: false, message: "Face not recognized" });

    const student = students.find((s) => String(s._id) === data.studentId);

    try {
      await Attendance.create({ student: student._id, date: today(), status: "present" });
      res.json({ matched: true, message: "Attendance marked", name: student.name, rollNo: student.rollNo });
    } catch (e) {
      if (e.code === 11000)
        return res.json({ matched: true, message: "Already marked today", name: student.name, rollNo: student.rollNo });
      throw e;
    }
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || "Scan failed";
    res.status(400).json({ message: msg });
  }
});

// Aaj ki attendance list
router.get("/today", async (req, res) => {
  const records = await Attendance.find({ date: today() }).populate("student", "name rollNo");
  res.json(records);
});

router.delete("/:id", async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: "Attendance removed" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;