"use strict";

var express = require('express');

var session = require('express-session');

var path = require('path');

var puppeteer = require('puppeteer');

var pug = require('pug');

var app = express();
var PORT = process.env.PORT || 3000; // Setup Static Files and View Engine

app.use(express["static"](path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug'); // Middleware to parse form data and handle sessions

app.use(express.urlencoded({
  extended: true
}));
app.use(session({
  secret: 'super-secret-key-for-cfs',
  resave: false,
  saveUninitialized: false
})); // Middleware to protect routes

var requireAuth = function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}; // ==========================================
// MOCK DATABASE
// ==========================================
// Note: Dates have been updated to match the DD/MM/YYYY format


var mockClients = [{
  firstName: "John",
  lastName: "Doe",
  gender: "male",
  dob: "15/05/1990"
}, {
  firstName: "Jane",
  lastName: "Smith",
  gender: "female",
  dob: "22/08/1985"
}, {
  firstName: "Alex",
  lastName: "Taylor",
  gender: "other",
  dob: "10/01/2000"
}]; // ==========================================
// ROUTES
// ==========================================
// Root Redirect

app.get('/', function (req, res) {
  res.redirect('/form');
}); // GET: Login Page

app.get('/login', function (req, res) {
  res.render('login', {
    error: null
  });
}); // POST: Handle Login Auth

app.post('/login', function (req, res) {
  var _req$body = req.body,
      username = _req$body.username,
      password = _req$body.password; // MOCK AUTHENTICATION: Accept any login if both fields are filled.

  if (username && password) {
    req.session.user = {
      username: username
    };
    res.redirect('/form');
  } else {
    res.render('login', {
      error: 'Please enter both username and password.'
    });
  }
}); // GET: Logout

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect('/login');
}); // GET: Main Assessment Form (Protected)

app.get('/form', requireAuth, function (req, res) {
  var searchName = req.query.clientName;
  console.log("--- SEARCH TRIGGERED ---");
  console.log("Searched for:", searchName);
  var clientData = null;
  var searchMessage = null;

  if (searchName) {
    // Search our mock database (case-insensitive)
    var found = mockClients.find(function (c) {
      return "".concat(c.firstName, " ").concat(c.lastName).toLowerCase().includes(searchName.toLowerCase());
    });

    if (found) {
      clientData = found;
      searchMessage = "Success! Client data loaded for: ".concat(found.firstName, " ").concat(found.lastName);
      console.log("Match Found:", clientData);
    } else {
      searchMessage = "No client found matching: \"".concat(searchName, "\". Please fill manually.");
      console.log("No match found.");
    }
  }

  res.render('form', {
    user: req.session.user,
    client: clientData,
    searchMessage: searchMessage,
    searchQuery: searchName || ''
  });
}); // POST: Handle Form Submission & Generate PDF (Protected)

app.post('/submit', requireAuth, function _callee(req, res) {
  var formData, html, browser, page, pdfBuffer;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          formData = req.body;
          console.log('Form Submitted by:', req.session.user.username);
          _context.prev = 2;
          // 1. Render the base template to an HTML string
          html = pug.renderFile(path.join(__dirname, 'views', 'form.pug'), {
            user: req.session.user,
            client: null,
            searchMessage: null,
            searchQuery: ''
          }); // 2. Inject CSS to hide web UI and prevent extra blank PDF pages

          html = html.replace('<head>', "\n            <head>\n            <base href=\"http://localhost:".concat(PORT, "/\">\n            <style>\n                /* Hide web UI from the PDF */\n                .web-top-bar, .search-section, .submit-section { display: none !important; }\n                \n                /* Print formatting to prevent extra blank pages */\n                @media print {\n                    @page { margin: 0; }\n                    html, body, form { \n                        margin: 0 !important; \n                        padding: 0 !important; \n                        background-color: white !important; \n                    }\n                    .page { \n                        box-shadow: none !important; \n                        margin: 0 !important; \n                        page-break-after: always;\n                    }\n                    /* CRITICAL: Tell browser NOT to break after the very last page */\n                    .page:last-of-type {\n                        page-break-after: avoid !important;\n                        margin-bottom: 0 !important;\n                    }\n                }\n            </style>\n        ")); // 3. Launch Puppeteer (Hidden Browser)

          _context.next = 7;
          return regeneratorRuntime.awrap(puppeteer.launch({
            headless: 'new'
          }));

        case 7:
          browser = _context.sent;
          _context.next = 10;
          return regeneratorRuntime.awrap(browser.newPage());

        case 10:
          page = _context.sent;
          _context.next = 13;
          return regeneratorRuntime.awrap(page.setContent(html, {
            waitUntil: 'networkidle0'
          }));

        case 13:
          _context.next = 15;
          return regeneratorRuntime.awrap(page.evaluate(function (data) {
            for (var key in data) {
              var elements = document.getElementsByName(key);

              if (elements.length > 0) {
                var el = elements[0];

                if (el.type === 'radio' || el.type === 'checkbox') {
                  (function () {
                    // Handle multiple checkboxes with the same name
                    var values = Array.isArray(data[key]) ? data[key] : [data[key]];
                    elements.forEach(function (e) {
                      if (values.includes(e.value)) e.checked = true;
                    });
                  })();
                } else {
                  // Fill text and date inputs
                  el.value = data[key];
                }
              }
            } // Explicitly show the secondary phone field if "Yes" was selected


            if (data.add_phone_2 === 'yes') {
              var phoneContainer = document.getElementById('screen_4_2');
              if (phoneContainer) phoneContainer.classList.remove('hidden');
            }
          }, formData));

        case 15:
          _context.next = 17;
          return regeneratorRuntime.awrap(page.pdf({
            format: 'Letter',
            printBackground: true,
            // Ensures colored backgrounds and borders render
            margin: {
              top: '0',
              right: '0',
              bottom: '0',
              left: '0'
            }
          }));

        case 17:
          pdfBuffer = _context.sent;
          _context.next = 20;
          return regeneratorRuntime.awrap(browser.close());

        case 20:
          // 7. Send the PDF to the user as a file download
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': "attachment; filename=\"Risk_Assessment_".concat(formData.first_name || 'Client', "_").concat(formData.last_name || '', ".pdf\""),
            'Content-Length': pdfBuffer.length
          });
          res.end(pdfBuffer);
          _context.next = 28;
          break;

        case 24:
          _context.prev = 24;
          _context.t0 = _context["catch"](2);
          console.error('Error generating PDF:', _context.t0);
          res.status(500).send('An error occurred while generating the PDF.');

        case 28:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[2, 24]]);
}); // GET: Success Page (Protected - fallback in case needed)

app.get('/success', requireAuth, function (req, res) {
  res.render('success');
}); // ==========================================
// START SERVER
// ==========================================

app.listen(PORT, function () {
  console.log("Server is running on http://localhost:".concat(PORT));
});