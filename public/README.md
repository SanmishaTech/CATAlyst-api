# Catalyst Frontend

A modern, responsive web interface for the Catalyst Order Management System.

## Features

### 🔐 Login Page
- Secure authentication with email and password
- API key-based session management
- Password reset functionality
- Automatic session handling

### 📊 Orders Page
- View all orders in a paginated table
- Search orders by Order ID, Symbol
- Filter by Status (Pending, Filled, Cancelled, Rejected)
- Filter by Side (Buy, Sell)
- **Upload Orders:**
  - Excel file upload (.xlsx, .xls, .csv)
  - JSON data upload
  - Drag-and-drop support
  - Template download
- Real-time order display with formatted data

### 📦 Batches Page
- View batch upload history
- Statistics dashboard showing:
  - Total batches
  - Completed batches
  - Processing batches
  - Total orders imported
- Filter batches by status
- View batch details
- Delete batches
- Success rate tracking

## Technology Stack

- **Pure HTML/CSS/JavaScript** - No frameworks required
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, professional interface
- **Single Page Application (SPA)** - Fast navigation without page reloads

## Getting Started

### Prerequisites

Ensure your backend server is running with the API endpoints configured.

### Access the Frontend

1. Start your Node.js server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. You'll be redirected to the login page

### Default Login

Use the credentials from your database seed or create a user via the API.

## File Structure

```
public/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Complete styling
├── js/
│   ├── utils.js       # Utility functions & API client
│   ├── auth.js        # Authentication module
│   ├── orders.js      # Orders page logic
│   ├── batches.js     # Batches page logic
│   └── app.js         # Main application
└── README.md          # This file
```

## Usage Guide

### Logging In

1. Enter your email and password
2. Click "Sign In"
3. You'll be redirected to the Orders page upon successful login

### Managing Orders

#### Viewing Orders
- Orders are displayed in a table with pagination
- Use the search box to find specific orders
- Apply filters to narrow down results

#### Uploading Orders

**Via Excel File:**
1. Click "Download Template" to get the order template
2. Fill in your order data following the template format
3. Click "Upload Orders"
4. Select the "Excel File" tab
5. Drag and drop your file or click to browse
6. Click "Upload"

**Via JSON:**
1. Click "Upload Orders"
2. Select the "JSON Data" tab
3. Paste your JSON data (must include an "orders" array)
4. Click "Upload"

Example JSON format:
```json
{
  "orders": [
    {
      "orderId": "ORD-001",
      "orderSymbol": "AAPL",
      "orderSide": "BUY",
      "orderQuantity": 100,
      "orderPrice": 150.50,
      "orderStatus": "PENDING",
      "orderType": "LIMIT"
    }
  ]
}
```

### Managing Batches

1. Navigate to the "Batches" page via the navigation menu
2. View statistics at the top of the page
3. See all your batch uploads in the table
4. Filter batches by status
5. Click "View" to see batch details
6. Click "Delete" to remove a batch (includes all its orders)

## API Integration

The frontend communicates with the following API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Orders
- `GET /api/orders` - List orders (with pagination, search, filters)
- `GET /api/orders/template` - Download order template
- `POST /api/orders/upload` - Upload orders (Excel or JSON)

### Batches
- `GET /api/batches` - List batches
- `GET /api/batches/stats` - Get batch statistics
- `GET /api/batches/:id` - Get batch details
- `GET /api/batches/:id/orders` - Get orders in a batch
- `DELETE /api/batches/:id` - Delete a batch

## Authentication

The frontend uses API key authentication:
- API keys are obtained during login
- Stored in browser's localStorage
- Automatically included in API requests via the `x-api-key` header
- Sessions persist across browser sessions
- Logout clears the API key

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Customization

### Changing Colors

Edit `css/style.css` and modify the CSS variables in the `:root` selector:

```css
:root {
    --primary-color: #4f46e5;
    --success-color: #10b981;
    --danger-color: #ef4444;
    /* ... etc */
}
```

### Adding Features

Each page has its own JavaScript module:
- `auth.js` - Login/logout functionality
- `orders.js` - Orders page features
- `batches.js` - Batches page features
- `utils.js` - Shared utilities and API client

## Troubleshooting

### Can't Access Frontend
- Ensure the backend server is running
- Check that the `public` directory is being served by Express
- Verify the port (default: 3000)

### Login Fails
- Check your email and password
- Verify the API endpoint is correct
- Check browser console for errors

### Upload Fails
- Ensure file is in correct format (.xlsx, .xls, .csv)
- Verify file size is under 10MB
- Check JSON format is valid
- Ensure required field `orderId` is present

### API Errors
- Open browser Developer Tools (F12)
- Check the Console tab for error messages
- Verify API key is being sent in requests
- Check Network tab for failed requests

## Development

To modify the frontend:

1. Edit files in the `public` directory
2. Refresh your browser to see changes
3. No build step required

## Security

- API keys are stored in localStorage (client-side)
- All API requests require authentication
- Passwords are never stored client-side
- HTTPS is recommended for production

## License

This frontend is part of the Catalyst Order Management System.
