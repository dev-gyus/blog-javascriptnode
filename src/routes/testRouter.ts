var express = require('express');
var router = express.Router();
import { RequestHandler } from 'express';

const getTestPage: RequestHandler = (req, res, next) => {
  res.render('testPage', {});
};

router.get('/', getTestPage)

module.exports = router;
