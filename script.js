// Get reference to the table body and add toggle button
const toggleTable = document.getElementById('toggleTable').getElementsByTagName('tbody')[0];
const addToggleButton = document.getElementById('addToggleButton');
const toggleNameInput = document.getElementById('toggleName');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCpy8Lm9wKOfDzyo4oKzY-UsV4gXJhJ3Zs",
    authDomain: "smartplug-bm.firebaseapp.com",
    databaseURL: "https://smartplug-bm-default-rtdb.firebaseio.com",
    projectId: "smartplug-bm",
    storageBucket: "smartplug-bm.appspot.com",
    messagingSenderId: "653739272227",
    appId: "1:653739272227:web:f02680d761640cdc9ee996",
    measurementId: "G-46TT62YR4Y"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// MQTT connection setup
const options = {
    clientId: 'web_client_' + Math.random().toString(16).substr(2, 8),
    username: 'smartplug',
    password: 'Smartplug24',
    clean: true,
    connectTimeout: 4000,
    keepalive: 60,
    reconnectPeriod: 1000,
};

// Connect to MQTT broker
const client = mqtt.connect('wss://9f100f561c864c9ab4ff48d9950c4985.s1.eu.hivemq.cloud:8884/mqtt', options);

// MQTT Topic Publish dan Subscribe
const baseTopic = 'smartplug/';
const toggleRef = db.ref('smartplug');

// On successful connection
client.on('connect', function () {
    console.log('Connected to HiveMQ Cloud MQTT broker');

    // Fetch all toggles from Firebase
    toggleRef.once('value', (snapshot) => {
        const data = snapshot.val();

        // Subscribe to all toggle topics
        for (const toggleName in data) {
            const topicSub = `konf/${baseTopic}${toggleName}`;
            client.subscribe(topicSub, function (err) {
                if (!err) {
                    console.log(`Subscribed to topic: ${topicSub}`);
                } else {
                    console.error('Failed to subscribe:', err);
                }
            });
        }
    });
});

// On receiving a message
client.on('message', function (topic, message) {
    // Extract toggleName from the topic
    const toggleName = topic.split('/').pop();
    const msg = message.toString();
    console.log(`Message received on topic ${topic}: ${msg}`);

    // Update status in Firebase based on received message
    toggleRef.child(toggleName).update({
        status: msg, // Update the status in Firebase
    }).then(() => {
        console.log(`Status of ${toggleName} updated to ${msg}`);
    }).catch((error) => {
        console.error("Error updating status:", error);
    });
});

// Function to add new toggle to Firebase
addToggleButton.addEventListener('click', () => {
    const toggleName = toggleNameInput.value.trim();

    if (toggleName) {
        // Add new toggle with default values
        toggleRef.child(toggleName).set({
            status: '', // Default status
            switch: false  // Default toggle switch value
        }).then(() => {
            // Clear input field after adding
            toggleNameInput.value = '';

            // Subscribe to the new toggle's topic
            const topicSub = `konf/${baseTopic}${toggleName}`;
            client.subscribe(topicSub, function (err) {
                if (!err) {
                    console.log(`Subscribed to new topic: ${topicSub}`);
                } else {
                    console.error('Failed to subscribe to new topic:', err);
                }
            });
        }).catch((error) => {
            console.error("Error adding toggle:", error);
        });
    } else {
        alert("Masukan Nama Kelas");
    }
});

// Fetch data from Firebase and populate the table
toggleRef.on('value', (snapshot) => {
    const data = snapshot.val();
    toggleTable.innerHTML = ''; // Clear previous content

    for (const toggleName in data) {
        const toggleData = data[toggleName];
        const row = document.createElement('tr');

        // Create the table columns
        const nameCell = document.createElement('td');
        nameCell.textContent = toggleName; // Kelas/Toggle Name

        const statusCell = document.createElement('td');
        statusCell.textContent = toggleData.status; // Status

        const switchCell = document.createElement('td');
        const toggleSwitch = document.createElement('label'); // Create a label for the switch
        toggleSwitch.classList.add('switch'); // Add class for styling

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = toggleData.switch; // Toggle Switch status

        // Create the slider for the switch
        const slider = document.createElement('span');
        slider.classList.add('slider');

        // Event listener for the toggle switch
        input.addEventListener('change', () => {
            const topicPub = `${baseTopic}${toggleName}`;
            const message = input.checked ? 'ON' : 'OFF';

            // Publish message to MQTT when switch is changed
            client.publish(topicPub, message, function (err) {
                if (!err) {
                    console.log(`Message "${message}" sent to topic: ${topicPub}`);
                } else {
                    console.error('Failed to publish:', err);
                }
            });

            // Update the toggle switch status in Firebase
            toggleRef.child(toggleName).update({ switch: input.checked });
        });

        // Append the input and slider to the label
        toggleSwitch.appendChild(input);
        toggleSwitch.appendChild(slider);
        switchCell.appendChild(toggleSwitch);

        const menuCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            // Remove the toggle from Firebase when delete button is clicked
            toggleRef.child(toggleName).remove();
        });
        menuCell.appendChild(deleteButton);

        row.appendChild(nameCell);
        row.appendChild(statusCell);
        row.appendChild(switchCell);
        row.appendChild(menuCell);

        toggleTable.appendChild(row);
    }
});
