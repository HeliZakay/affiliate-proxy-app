// validation.js
import { query, validationResult } from "express-validator";

// Validation chain for the redirect endpoint
export const validateRedirect = [
  query("keyword")
    .notEmpty()
    .withMessage("keyword is required")
    .bail()
    .isString()
    .withMessage("keyword must be a string"),
  query("src")
    .notEmpty()
    .withMessage("src is required")
    .bail()
    .isString()
    .withMessage("src must be a string"),
  query("creative")
    .notEmpty()
    .withMessage("creative is required")
    .bail()
    .isString()
    .withMessage("creative must be a string"),
  // optional refresh must be 'true' if present
  query("refresh")
    .optional()
    .isIn(["true"])
    .withMessage("refresh, if provided, must be 'true'"),

  // final error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
