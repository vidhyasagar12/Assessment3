"use strict";

document.addEventListener('DOMContentLoaded', function () {
  // ==========================================
  // 1. CONSENT VALIDATION LOGIC
  // ==========================================
  var unconsentedCheck = document.getElementById('unconsented_check');
  var witnessContainer = document.getElementById('witness_signature_container');
  var consentFields = [{
    id: 'consent_date',
    labelContainer: null
  }, {
    id: 'signature_assessed',
    labelContainer: null
  }, {
    id: 'witness_signature',
    labelContainer: witnessContainer
  }];

  function updateConsentLogic() {
    var isUnconsented = unconsentedCheck.checked;
    consentFields.forEach(function (field) {
      var input = document.getElementById(field.id);

      if (input) {
        input.required = !isUnconsented;

        if (isUnconsented) {
          input.value = '';
        }
      }

      if (field.labelContainer) {
        field.labelContainer.style.visibility = isUnconsented ? 'hidden' : 'visible';
      }
    });
  }

  if (unconsentedCheck) {
    unconsentedCheck.addEventListener('change', updateConsentLogic); // Run once on load to ensure initial state is correct

    updateConsentLogic();
  } // ==========================================
  // 2. SECONDARY PHONE NUMBER LOGIC
  // ==========================================


  var phoneContainer = document.getElementById('screen_4_2');
  var phone2Input = document.getElementById('phone_2');
  var radioButtons = document.getElementsByName('add_phone_2');

  if (phoneContainer && phone2Input) {
    // Initialize: Hide and disable the field by default
    phoneContainer.classList.add('hidden');
    phone2Input.disabled = true;
    radioButtons.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (this.value === 'yes') {
          // Show and Enable
          phoneContainer.classList.remove('hidden');
          phone2Input.disabled = false;
          phone2Input.focus();
        } else {
          // Hide and Disable
          phoneContainer.classList.add('hidden');
          phone2Input.disabled = true;
          phone2Input.value = ''; // Clear value if they hide it again
        }
      });
    });
  }

  var phoneInputs = document.querySelectorAll('.phone-mask');
  phoneInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      // Replace any character that is NOT a digit (\D) with nothing
      this.value = this.value.replace(/\D/g, '');
    });
  }); // ==========================================
  // 4. DATE FORMATTING (DD/MM/YY)
  // ==========================================
  // ==========================================
  // 4. DATE FORMATTING (DD/MM/YYYY) - Updated for 4-digit year
  // ==========================================

  var dateInputs = document.querySelectorAll('.date-mask');
  dateInputs.forEach(function (input) {
    input.addEventListener('input', function (e) {
      // Strip all non-digit characters
      var v = this.value.replace(/\D/g, ''); // Limit to 8 digits maximum (DD MM YYYY)

      if (v.length > 8) v = v.substring(0, 8); // Automatically add the slashes

      var formatted = v;

      if (v.length > 4) {
        formatted = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
      } else if (v.length > 2) {
        formatted = v.substring(0, 2) + '/' + v.substring(2, 4);
      }

      this.value = formatted;
    });
  }); // ==========================================
  // 5. SYNC PERSON NAME TO PAGE 2
  // ==========================================

  var firstNameInput = document.getElementById('first_name');
  var lastNameInput = document.getElementById('last_name');
  var personNameDisplay = document.getElementById('person_name_display');

  function updatePersonName() {
    if (personNameDisplay) {
      var first = firstNameInput ? firstNameInput.value : '';
      var last = lastNameInput ? lastNameInput.value : '';
      personNameDisplay.value = "".concat(first, " ").concat(last).trim();
    }
  } // Listen for typing in the First and Last name fields


  if (firstNameInput) firstNameInput.addEventListener('input', updatePersonName);
  if (lastNameInput) lastNameInput.addEventListener('input', updatePersonName);
});