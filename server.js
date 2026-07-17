const express = require('express');
const session = require('express-session');
const path = require('path');
const puppeteer = require('puppeteer');
const pug = require('pug');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Static Files and View Engine
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware to parse form data and handle sessions
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'super-secret-key-for-cfs',
    resave: false,
    saveUninitialized: false
}));

// Middleware to protect routes
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// ==========================================
// MOCK DATABASE
// ==========================================
// Note: Dates have been updated to match the DD/MM/YYYY format
const mockClients = [
    { firstName: "John", lastName: "Doe", gender: "male", dob: "15/05/1990" },
    { firstName: "Jane", lastName: "Smith", gender: "female", dob: "22/08/1985" },
    { firstName: "Alex", lastName: "Taylor", gender: "other", dob: "10/01/2000" }
];

// ==========================================
// ROUTES
// ==========================================

// Root Redirect
app.get('/', (req, res) => {
    res.redirect('/form');
});

// GET: Login Page
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// POST: Handle Login Auth
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // MOCK AUTHENTICATION: Accept any login if both fields are filled.
    if (username && password) {
        req.session.user = { username: username };
        res.redirect('/form');
    } else {
        res.render('login', { error: 'Please enter both username and password.' });
    }
});

// GET: Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// GET: Main Assessment Form (Protected)
app.get('/form', requireAuth, (req, res) => {
    const searchName = req.query.clientName; 
    
    console.log("--- SEARCH TRIGGERED ---");
    console.log("Searched for:", searchName); 

    let clientData = null;
    let searchMessage = null;

    if (searchName) {
        // Search our mock database (case-insensitive)
        const found = mockClients.find(c => 
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchName.toLowerCase())
        );

        if (found) {
            clientData = found;
            searchMessage = `Success! Client data loaded for: ${found.firstName} ${found.lastName}`;
            console.log("Match Found:", clientData);
        } else {
            searchMessage = `No client found matching: "${searchName}". Please fill manually.`;
            console.log("No match found.");
        }
    }

    res.render('form', { 
        user: req.session.user,
        client: clientData,
        searchMessage: searchMessage,
        searchQuery: searchName || ''
    });
});

// POST: Handle Form Submission & Generate PDF (Protected)
app.post('/submit', requireAuth, async (req, res) => {
    const formData = req.body;
    console.log('Form Submitted by:', req.session.user.username);
    
    try {
        // 1. Render the base template to an HTML string
        let html = pug.renderFile(path.join(__dirname, 'views', 'form.pug'), {
            user: req.session.user,
            client: null, 
            searchMessage: null,
            searchQuery: ''
        });

        // 2. Inject CSS to hide web UI and prevent extra blank PDF pages
        html = html.replace('<head>', `
            <head>
            <base href="http://localhost:${PORT}/">
            <style>
                /* Hide web UI from the PDF */
                .web-top-bar, .search-section, .submit-section { display: none !important; }
                
                /* Print formatting to prevent extra blank pages */
                @media print {
                    @page { margin: 0; }
                    html, body, form { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background-color: white !important; 
                    }
                    .page { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        page-break-after: always;
                    }
                    /* CRITICAL: Tell browser NOT to break after the very last page */
                    .page:last-of-type {
                        page-break-after: avoid !important;
                        margin-bottom: 0 !important;
                    }
                }
            </style>
        `);

        // 3. Launch Puppeteer (Hidden Browser)
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        // 4. Load the HTML into the page
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // 5. Inject the submitted data back into the form fields
        await page.evaluate((data) => {
            for (const key in data) {
                const elements = document.getElementsByName(key);
                if (elements.length > 0) {
                    const el = elements[0];
                    if (el.type === 'radio' || el.type === 'checkbox') {
                        // Handle multiple checkboxes with the same name
                        const values = Array.isArray(data[key]) ? data[key] : [data[key]];
                        elements.forEach(e => {
                            if (values.includes(e.value)) e.checked = true;
                        });
                    } else {
                        // Fill text and date inputs
                        el.value = data[key];
                    }
                }
            }
            
            // Explicitly show the secondary phone field if "Yes" was selected
            if (data.add_phone_2 === 'yes') {
                const phoneContainer = document.getElementById('screen_4_2');
                if (phoneContainer) phoneContainer.classList.remove('hidden');
            }
        }, formData);

        // 6. Generate the PDF exactly as it looks on the screen
        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true, // Ensures colored backgrounds and borders render
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();

        // 7. Send the PDF to the user as a file download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Risk_Assessment_${formData.first_name || 'Client'}_${formData.last_name || ''}.pdf"`,
            'Content-Length': pdfBuffer.length
        });
        
        res.end(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('An error occurred while generating the PDF.');
    }
});

// GET: Success Page (Protected - fallback in case needed)
app.get('/success', requireAuth, (req, res) => {
    res.render('success');
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});