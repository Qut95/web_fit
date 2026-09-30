import Keycloak from 'keycloak-js';

// On indique à React où trouver le serveur Keycloak local
const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'Projet-fit-realm',
  clientId: 'projet-fit-client'
});

export default keycloak;