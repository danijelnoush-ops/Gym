// VAŽNO: ZAMENITE OVE PODATKE SA VAŠIM GMAIL NALOGOM
export const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'vasa.email@gmail.com', // ZAMENITE sa vašim Gmail-om
    pass: 'vasasifra' // ZAMENITE sa vašom šifrom (za Gmail morate koristiti App Password)
  }
};

// KAKO DOBITI GMAIL APP PASSWORD:
// 1. Idite na Google Account → Security
// 2. Uključite 2-Factor Authentication
// 3. Idite na App Passwords
// 4. Izaberite "Mail" i "Other" (nazovite "Gym Dashboard")
// 5. Kopirajte generisanu šifru (16 karaktera)
// 6. Tu šifru stavite umesto 'vasasifra'
