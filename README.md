# ld-spam-remover

This is a script designed to eliminate spam from Ludum Dare's main page. 

To activate it:
 - Install GreaseMonkey for Firefox or a similar tool for other browsers. 
 - Create a new script 
 - Copy the contents of the provided javascript file.
 
While the script is not flawless, it is likely to be improved in the future.
 
This is how it works:
 - The script analyzes each post to determine how many games and posts the user has published on LD's website.
 - If a user has never published a game and has created three or more posts, their content will be considered spam.
 - If a user has never published a game and created fewer than three posts but their post contains two or more links, it will also be flagged as spam.
 - When content is deemed spam, the script uses the tag's style attribute to hide the post.
 - A message is also added in the browser's console.

Customize the script to your liking, and enjoy an - almost - spam-free browsing experience on the LD's page!
