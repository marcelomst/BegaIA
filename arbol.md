.
├── app
│   ├── admin
│   │   ├── *ChannelSidebar.tsx*
│   │   ├── channels
│   │   │   └── page.tsx
│   │   ├── embeddings
│   │   │   └── page.tsx
│   │   ├── hotels
│   │   │   ├── [hotelId]
│   │   │   │   └── edit
│   │   │   ├── new
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── logs
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── prompts
│   │   │   └── page.tsx
│   │   ├── roles
│   │   │   └── page.tsx
│   │   ├── send-verification
│   │   │   └── page.tsx
│   │   ├── test-toast
│   │   │   └── page.tsx
│   │   ├── upload
│   │   │   └── page.tsx
│   │   └── users
│   │       ├── delete
│   │       │   └── route.ts
│   │       ├── get
│   │       │   └── route.ts
│   │       ├── list
│   │       │   └── page.tsx
│   │       ├── manage
│   │       │   ├── [userId]
│   │       │   ├── *new*
│   │       │   └── page.tsx
│   │       ├── page.tsx
│   │       ├── update
│   │       │   └── route.ts
│   │       └── verification
│   │           └── page.tsx
│   ├── api
│   │   ├── chat
│   │   │   └── route.ts
│   │   ├── config
│   │   │   ├── add
│   │   │   │   └── route.ts
│   │   │   ├── channel
│   │   │   │   └── [channel]
│   │   │   ├── mode
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   ├── toggle
│   │   │   │   └── route.ts
│   │   │   └── whatsapp
│   │   │       └── route.ts
│   │   ├── conversations
│   │   │   ├── create
│   │   │   │   └── route.ts
│   │   │   └── list
│   │   │       └── route.ts
│   │   ├── debug
│   │   │   └── hotelPhoneMap
│   │   │       └── route.ts
│   │   ├── email 
│   │   ├── guests
│   │   │   └── [hotelId]
│   │   │       └── [guestId]
│   │   ├── hotel-document-details
│   │   │   └── route.ts
│   │   ├── hotel-documents
│   │   │   └── route.ts
│   │   ├── hotel-texts
│   │   │   └── route.ts
│   │   ├── hotel-texts-rebuild
│   │   │   └── route.ts
│   │   ├── hotels
│   │   │   ├── create
│   │   │   │   └── route.ts
│   │   │   ├── delete
│   │   │   │   └── route.ts
│   │   │   ├── delete-version
│   │   │   │   └── route.ts
│   │   │   ├── get
│   │   │   │   └── route.ts
│   │   │   ├── list
│   │   │   │   └── route.ts
│   │   │   ├── list-versions
│   │   │   │   └── route.ts
│   │   │   ├── rollback-version
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   ├── update
│   │   │   │   └── route.ts
│   │   │   └── upload-docs
│   │   │       └── route.ts
│   │   ├── login
│   │   │   └── route.ts
│   │   ├── logout
│   │   │   └── route.ts
│   │   ├── me
│   │   │   ├── change-password
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── messages
│   │   │   ├── by-conversation
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── refresh
│   │   │   └── route.ts
│   │   ├── test
│   │   │   └── list-users
│   │   │       └── route.ts
│   │   ├── users
│   │   │   ├── change-password
│   │   │   │   └── route.ts
│   │   │   ├── check-verification-token
│   │   │   │   └── route.ts
│   │   │   ├── create
│   │   │   │   └── route.ts
│   │   │   ├── delete
│   │   │   │   └── route.ts
│   │   │   ├── get
│   │   │   │   └── route.ts
│   │   │   ├── hotels-for-user
│   │   │   │   └── route.ts
│   │   │   ├── list
│   │   │   │   └── route.ts
│   │   │   ├── reset-password
│   │   │   │   └── route.ts
│   │   │   ├── send-recovery-email
│   │   │   │   └── route.ts
│   │   │   ├── send-verification-email
│   │   │   │   └── route.ts
│   │   │   ├── update
│   │   │   │   └── route.ts
│   │   │   ├── validate-reset-token
│   │   │   │   └── route.ts
│   │   │   ├── verify-account
│   │   │   │   └── route.ts
│   │   │   └── verify-account-set-password
│   │   │       └── route.ts
│   │   └── whatsapp
│   │       ├── qr
│   │       │   └── route.ts
│   │       ├── route.ts
│   │       └── status
│   │           └── route.ts
│   ├── auth
│   │   ├── change-password
│   │   │   └── page.tsx
│   │   ├── forgot-password
│   │   │   └── page.tsx
│   │   ├── login
│   │   │   └── page.tsx
│   │   ├── reset-password
│   │   │   ├── ResetPasswordForm.tsx
│   │   │   └── page.tsx
│   │   └── verify-account
│   │       ├── VerifyAccountClient.tsx
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── lib
│   │   └── translation.ts
│   ├── page.tsx
│   └── test-dnd
│       └── page.tsx
├── components
│   ├── UsertStatus.tsx
│   ├── admin
│   │   ├── ChannelInbox.tsx
│   │   ├── ChannelMessages.tsx
│   │   ├── ChannelOverview.tsx
│   │   ├── ChannelPanel.tsx
│   │   ├── ChannelSidebar.tsx
│   │   ├── ChannelStatusCard.tsx
│   │   ├── ChannelWhatsAppConfig.tsx
│   │   ├── ChannelsClient.tsx
│   │   ├── ChatPage.tsx
│   │   ├── ChunkDetailsTable.tsx
│   │   ├── HotelDocumentUploader.tsx
│   │   ├── HotelTextViewer.tsx
│   │   ├── ShowOriginalText.tsx
│   │   ├── WhatsAppConfigForm.tsx
│   │   ├── WhatsAppQrPanel.tsx
│   │   └── guesteditor.tsx
│   ├── ui
│   │   ├── BegasistTable.tsx
│   │   ├── DarkCard.tsx
│   │   ├── Input.tsx
│   │   ├── RadixTooltip.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SidebarGroup.tsx
│   │   ├── SidebarLink.tsx
│   │   ├── SidebarLogout.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   └── toaster.tsx
│   └── utils
│       └── ApplyThemeClass.tsx
├── constants
│   └── roles.ts
├── deprecated
│   ├── addChannelToHotelConfig.ts
│   ├── load_from_pdf.ts
│   ├── page.tsx
│   └── toggle
│       └── route.ts
├── docs
│   ├── Arquitectura_segura_gestion_de_usuarios.png
│   └── ChatGPT Image 23 may 2025, 05_30_52.png
├── knowledge_docs
├── lib
│   ├── agents
│   │   ├── billing.ts
│   │   ├── defaultResponse.ts
│   │   ├── index.ts
│   │   ├── internal_support.ts
│   │   ├── reservations.ts
│   │   ├── retrieval_based.ts
│   │   └── services.ts
│   ├── api
│   │   └── fetchWithAuth.ts
│   ├── astra
│   │   ├── connection.ts
│   │   ├── hotelTextCollection.ts
│   │   └── index.ts
│   ├── auth
│   │   ├── findUserByEmail.ts
│   │   ├── getCurrentUser.ts
│   │   ├── getCurrentUserEmail.ts
│   │   ├── jwt.ts
│   │   ├── roles.ts
│   │   ├── sendVerificationEmail.ts
│   │   ├── tokenUtils.ts
│   │   └── verifyUserAccount.ts
│   ├── classifier
│   │   ├── categoryAliases.ts
│   │   └── index.ts
│   ├── client
│   │   └── fetchWithAuth.ts
│   ├── config
│   │   ├── channelsConfig.ts
│   │   ├── getInitialHotelConfig.ts
│   │   ├── hotelConfig.client.ts
│   │   ├── hotelConfig.server.ts
│   │   ├── hotelLanguage.ts
│   │   ├── hotelPhoneMap.ts
│   │   └── initHotelConfig.ts
│   ├── constants
│   │   └── adminMenu.ts
│   ├── context
│   │   ├── HotelContext.tsx
│   │   ├── SidebarContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── UserContext.tsx
│   ├── db
│   │   ├── conversations.ts
│   │   ├── getHotelsForUser.ts
│   │   ├── guests.ts
│   │   └── messages.ts
│   ├── email
│   │   ├── sendEmail.ts
│   │   └── sendRecoveryEmail.ts
│   ├── entrypoints
│   │   ├── all.ts
│   │   ├── email.ts
│   │   └── whatsapp.ts
│   ├── hooks
│   │   ├── useChannelConfig.ts
│   │   ├── useCurrentUser.ts
│   │   └── useSession.ts
│   ├── i18n
│   │   ├── en.ts
│   │   ├── es.ts
│   │   ├── getDictionary.ts
│   │   └── pt.ts
│   ├── middleware
│   ├── pms
│   │   └── index.ts
│   ├── prompts
│   │   ├── index.ts
│   │   └── promptMetadata.ts
│   ├── retrieval
│   │   ├── deleteVersionForHotel.ts
│   │   ├── getHotelChunks.ts
│   │   ├── index.ts
│   │   ├── listVersionsForHotel.ts
│   │   ├── rollbackVersionForHotel.ts
│   │   └── validateClassification.ts
│   ├── services
│   │   ├── channelHandlers.ts
│   │   ├── channelManager.ts
│   │   ├── channelManagerMemory.ts
│   │   ├── channelMemory.ts
│   │   ├── email.ts
│   │   ├── emailMemory.ts
│   │   ├── hotel.ts
│   │   ├── messages
│   │   │   └── index.ts
│   │   ├── redis.ts
│   │   ├── webMemory.ts
│   │   ├── whatsapp.ts
│   │   ├── whatsappClient.ts
│   │   ├── whatsappMemory.ts
│   │   └── whatsappQrStore.ts
│   ├── utils
│   │   ├── buildVerificationUrl.ts
│   │   ├── debugLog.ts
│   │   ├── getChannelIcon.tsx
│   │   ├── isValidInternationalPhone.ts
│   │   ├── lang.ts
│   │   ├── language.ts
│   │   ├── parseChannel.ts
│   │   ├── roles.ts
│   │   ├── shortGuestId.ts
│   │   ├── similarity.ts
│   │   └── time.ts
│   └── utils.ts
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── pages
│   └── api
│       └── upload-hotel-document.ts
├── public
│   ├── file.svg
│   ├── fonts
│   ├── globe.svg
│   ├── icons
│   │   ├── channelManager.svg
│   │   ├── email.svg
│   │   ├── facebook.svg
│   │   ├── home.svg
│   │   ├── instagram.svg
│   │   ├── overview.svg
│   │   ├── telegram.svg
│   │   ├── tiktok.svg
│   │   ├── unknown.svg
│   │   ├── web.svg
│   │   ├── whatsapp.svg
│   │   └── x.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src
│   ├── app.ts
│   ├── config.ts
│   └── utils
├── tailwind.config.ts
├── test
│   ├── components
│   ├── data
│   ├── integration
│   └── services
├── test-bcrypt.ts
├── test-imap-connection.ts
├── test-imap-simple.ts
├── testAstraConnection.ts
├── types
│   ├── channel.ts
│   ├── chunk.ts
│   ├── mailparser.d.ts
│   ├── rehype-raw.d.ts
│   ├── roles.ts
│   └── user.ts
├── upload_to_wsgpt
├── utils
│   ├── conversationSession.ts
│   ├── fetchAndMapMessages.ts
│   ├── fetchAndMapMessagesWithSubject.ts
│   ├── fetchAndOrderConversations.ts
│   ├── fetchGuest.ts
│   ├── getChannelConfigs.ts
│   └── guestSession.ts
├── vector_cache
├── vitest.config.ts
└── vitest.setup.ts

138 directories, 249 files
