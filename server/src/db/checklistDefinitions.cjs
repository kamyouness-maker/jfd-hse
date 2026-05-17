const checklistDefinitions = {
  standards_hse: {
    label: 'Standards HSE',
    sections: {
      autorisation: {
        label: 'Autorisation de travail',
        items: {
          auth_1: 'Autorisation de travail disponible et signée',
          auth_2: 'Validité de l\'autorisation vérifiée',
          auth_3: 'Périmètre de travail délimité',
          auth_4: 'Analyse des risques effectuée',
          auth_5: 'Responsable travaux présent sur site'
        }
      },
      consignation: {
        label: 'Consignation',
        items: {
          cons_1: 'Procédure de consignation respectée',
          cons_2: 'Attestation de consignation disponible',
          cons_3: 'Cadenassage effectué',
          cons_4: 'Dispositifs de déverrouillage non disponibles',
          cons_5: 'Vérification absence d\'énergie effectuée'
        }
      },
      hauteur: {
        label: 'Travail en hauteur',
        items: {
          haut_1: 'Équipement adapté et certifié',
          haut_2: 'Harnais porté et inspecté',
          haut_3: 'Point d\'ancrage certifié conforme',
          haut_4: 'Zone balisée en dessous',
          haut_5: 'Échelle/échafaudage en bon état'
        }
      },
      espace_confine: {
        label: 'Espace confiné',
        items: {
          esp_1: 'Permis d\'entrée disponible',
          esp_2: 'Atmosphère testée (O2, gaz toxiques)',
          esp_3: 'Équipement de détection disponible',
          esp_4: 'Système de récupération en place',
          esp_5: 'Sentinelle présente et formée'
        }
      },
      circulation: {
        label: 'Circulation',
        items: {
          circ_1: 'Voies de circulation dégagées',
          circ_2: 'Signalisation de chantier en place',
          circ_3: 'Vitesse limitée respectée',
          circ_4: 'EPI port respecté',
          circ_5: 'Séparation piétons/véhicules assurée'
        }
      },
      mode_operatoire: {
        label: 'Mode opératoire',
        items: {
          mode_1: 'Mode opératoire disponible et connu',
          mode_2: 'Instructions de sécurité affichées',
          mode_3: 'Habilitations et formations vérifiées',
          mode_4: 'Outillage approprié à la tâche',
          mode_5: 'Plan de gestion des déchets respecté'
        }
      },
      epi: {
        label: 'EPI',
        items: {
          epi_1: 'Casque de sécurité porté',
          epi_2: 'Chaussures de sécurité portées',
          epi_3: 'Gilet haute visibilité porté',
          epi_4: 'Lunettes/masque de protection portés',
          epi_5: 'Gants adaptés portés',
          epi_6: 'Protection auditive portée si nécessaire'
        }
      }
    }
  },
  equipements: {
    label: 'Équipements',
    sections: {
      acces: {
        label: 'Moyens d\'accès',
        items: {
          acc_1: 'Échelles en bon état et homologuées',
          acc_2: 'Échafaudages inspectés et balisés',
          acc_3: 'Plateformes élévatrices vérifiées',
          acc_4: 'Passerelles et rambardes conformes',
          acc_5: 'Filets de sécurité installés si requis'
        }
      },
      soudage: {
        label: 'Soudage',
        items: {
          soud_1: 'Poste de soudage en bon état',
          soud_2: 'Extincteur à proximité',
          soud_3: 'Protection zones adjacentes assurée',
          soud_4: 'Masque de soudure et EPI adaptés',
          soud_5: 'Permis de feu disponible'
        }
      },
      extinction: {
        label: 'Extinction',
        items: {
          ext_1: 'Extincteurs accessibles et non obstrués',
          ext_2: 'Extincteurs dans délais de vérification',
          ext_3: 'Robinets incendie armés fonctionnels',
          ext_4: 'Plans d\'évacuation affichés',
          ext_5: 'Voies d\'évacuation dégagées'
        }
      },
      levage: {
        label: 'Levage',
        items: {
          lev_1: 'Engins de levage certifiés et vérifiés',
          lev_2: 'Élingues et accessoires conformes',
          lev_3: 'Plan de levage disponible si nécessaire',
          lev_4: 'Zone de levage balisée',
          lev_5: 'Opérateur certifié et habilité'
        }
      },
      pression: {
        label: 'Pression',
        items: {
          pres_1: 'Équipements sous pression vérifiés',
          pres_2: 'Soupapes de sécurité fonctionnelles',
          pres_3: 'Manomètres étalonnés',
          pres_4: 'Tuyauteries et raccords en bon état',
          pres_5: 'Registre de contrôle à jour'
        }
      },
      engins: {
        label: 'Engins',
        items: {
          eng_1: 'Engins vérifiés avant utilisation',
          eng_2: 'Carnet de bord à jour',
          eng_3: 'Conducteur habilité et certifié',
          eng_4: 'Dispositifs de sécurité fonctionnels',
          eng_5: 'Zones de manœuvre balisées'
        }
      },
      outillage: {
        label: 'Outillage',
        items: {
          out_1: 'Outillage adapté à la tâche',
          out_2: 'Outillage en bon état',
          out_3: 'Outillage électrique vérifié conforme',
          out_4: 'Rangement et stockage corrects',
          out_5: 'Registre d\'entretien à jour'
        }
      }
    }
  }
};

module.exports = checklistDefinitions;
