export default function handler(req, res) {
  if (req.method === "POST") {
    const data = req.body;
    console.log("Form submission:", data);

    // Example: return success
    res.status(200).json({ message: "Form submitted successfully", data });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}