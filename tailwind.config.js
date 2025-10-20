
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
       
        primary: '#695CF6',
        brandBlue: '#2563EB', 
        footer: '#0F172A',
        accentGreen: '#00BFA5', 
        accentBlue: '#03A9F4', 
        accentYellow: '#FFC107', 
        accentRed: '#F44336',
        secondary: '#E0E7FF', 
        background: '#F5F5F5', 
      },
      fontFamily: {
        heading: ['Tajawal', 'sans-serif'],
        body: ['Cairo', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
};
