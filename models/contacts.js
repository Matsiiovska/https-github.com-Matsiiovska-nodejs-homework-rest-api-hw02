const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const contactsPath = path.resolve(__dirname, "contacts.json");

async function listContacts() {
  const data = await fs.readFile(contactsPath, 'utf-8');
  const contacts = JSON.parse(data);
  return contacts;
}

async function getContactById(contactId) {
  const contacts = await listContacts();
  const contact = contacts.find((c) => c.id === contactId);
  return contact || null;
}

async function removeContact(contactId) {
  const contacts = await listContacts();
  const index = contacts.findIndex(contact => contact.id === contactId);
  if (index === -1) {
    return null;
  }
  const [removedContact] = contacts.splice(index, 1);
  await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  return removedContact;
}

async function addContact(name, email, phone) {
  const contacts = await fs.readFile(contactsPath, 'utf-8');
  const contactsArray = JSON.parse(contacts);

  // Генеруємо новий ідентифікатор для контакту
  const id = uuidv4();

  // Створюємо об'єкт нового контакту
  const newContact = {
    id,
    name,
    email,
    phone,
  };

  // Додаємо новий контакт до списку
  contactsArray.push(newContact);

  // Зберігаємо оновлений список контактів у файлі
  await fs.writeFile(contactsPath, JSON.stringify(contactsArray, null, 2));

  return newContact;
}

const updateContact = async (contactId, body) => {
  const contacts = await listContacts();
  const index = contacts.findIndex(contact => contact.id === contactId);

  if (index === -1) {
    return null;
  }
  contacts[index] = { ...contacts[index], ...body };

  await fs.writeFile(contactsPath, JSON.stringify(contacts, null, 2));
  return contacts[index];

};

async function getBuId(contactId) {
   const contacts = await listContacts();
  const contact = contacts.find((c) => c.id === contactId);
  return contact || null;

};

module.exports = {
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  getBuId,
};
