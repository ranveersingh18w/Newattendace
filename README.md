# Techno NJR Attendance Portal

A secure, mobile-responsive student attendance tracking system built with vanilla JavaScript and deployed on Vercel.

## Features

✅ **Secure API Management**: All API credentials are hidden in serverless backend functions  
✅ **Fully Responsive**: Optimized for mobile, tablet, and desktop devices  
✅ **Real-time Stats**: View attendance percentage, classes attended, and course performance  
✅ **Detailed Records**: Access complete attendance history with date, time, and status  
✅ **Modern UI**: Clean interface built with Tailwind CSS  

## Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS
- **Backend**: Vercel Serverless Functions (Node.js)
- **Deployment**: Vercel

## Project Structure

```
Newattendace/
├── api/                    # Serverless backend functions
│   ├── login.js           # Authentication endpoint
│   ├── stats.js           # Attendance statistics endpoint
│   └── records.js         # Attendance records endpoint
├── index.html             # Main HTML file
├── app.js                 # Frontend JavaScript
├── package.json           # Project metadata
├── vercel.json            # Vercel configuration
└── README.md              # This file
```

## Local Development

1. **Install Vercel CLI** (if not already installed):
   ```powershell
   npm install -g vercel
   ```

2. **Navigate to project directory**:
   ```powershell
   cd "c:\Users\Admin\Desktop\new attendace\Newattendace"
   ```

3. **Run development server**:
   ```powershell
   vercel dev
   ```

4. **Open in browser**: http://localhost:3000

## Deployment to Vercel

### Option 1: Using Vercel CLI (Recommended)

1. **Login to Vercel**:
   ```powershell
   vercel login
   ```
   Follow the prompts to authenticate.

2. **Deploy to production**:
   ```powershell
   vercel --prod
   ```

3. **Follow the prompts**:
   - Setup and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time) or **Y** (subsequent deployments)
   - What's your project's name? `techno-njr-attendance` (or your preferred name)
   - In which directory is your code located? `./`
   - Want to override the settings? **N**

4. **Your app will be deployed!** You'll receive a production URL like:
   ```
   https://techno-njr-attendance.vercel.app
   ```

### Option 2: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository (`ranveersingh18w/Newattendace`)
4. Configure:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
5. Click "Deploy"

## GitHub Integration

The project is already connected to GitHub:
- Repository: `ranveersingh18w/Newattendace`
- Branch: `main`

Any push to the main branch will automatically trigger a new deployment on Vercel (if GitHub integration is enabled).

## API Security

🔒 **All API credentials are now secure!**

- The original API endpoint and signature key are **NOT** exposed in the frontend
- All API calls are proxied through Vercel serverless functions
- Credentials are stored server-side in the `/api` directory
- Frontend only communicates with your own backend endpoints

## Mobile Responsiveness Features

- ✅ Optimized card layouts for small screens
- ✅ Touch-friendly buttons (44px minimum)
- ✅ Horizontal scrolling for tables on mobile
- ✅ Responsive typography and spacing
- ✅ Adaptive header with text truncation
- ✅ Hidden columns on small screens (Teacher column in records)

## Usage

1. **Login** with your credentials:
   - Roll Number (e.g., 24ETCAD024)
   - Email
   - Password

2. **View Dashboard**:
   - Overall attendance percentage
   - Classes attended vs total
   - Active courses count

3. **Check Performance**:
   - RTU Performance tab: Regular class attendance
   - Lab Performance tab: Laboratory session attendance

4. **Review Records**:
   - Complete attendance history
   - Date, time, course, and status for each entry

## Troubleshooting

### API not working after deployment
- Ensure all files in the `/api` directory are committed to GitHub
- Check Vercel function logs in the dashboard
- Verify the API endpoint in the external service is accessible

### Mobile layout issues
- Clear browser cache
- Test on different devices/browsers
- Check browser console for errors

### Login fails
- Verify credentials are correct
- Check network tab in browser DevTools
- Ensure backend functions are deployed correctly

## Support

For issues or questions, contact the development team or create an issue in the GitHub repository.

## License

MIT License - feel free to use this project for your own purposes.
