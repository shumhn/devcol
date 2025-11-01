use anchor_lang::prelude::*;

declare_id!("2PHztUTZuAeWx97sLuezfbmWiyKTzYb986Do2Bh338U7");

#[program]
pub mod devcol_solana {
    use super::*;

    // ==================== USER INSTRUCTIONS ====================
    
    /// Initialize a new user profile with enhanced fields
    pub fn create_user(
        ctx: Context<CreateUser>,
        username: String,
        display_name: String,
        role: String,
        location: String,
        bio: String,
        github_link: String,
        ipfs_metadata_hash: String,
    ) -> Result<()> {
        require!(username.len() <= 32, ErrorCode::UsernameTooLong);
        require!(display_name.len() <= 64, ErrorCode::DisplayNameTooLong);
        require!(role.len() <= 50, ErrorCode::RoleTooLong);
        require!(location.len() <= 50, ErrorCode::LocationTooLong);
        require!(bio.len() <= 200, ErrorCode::BioTooLong);
        require!(github_link.len() <= 100, ErrorCode::GithubLinkTooLong);
        require!(ipfs_metadata_hash.len() <= 64, ErrorCode::IpfsHashTooLong);

        let user = &mut ctx.accounts.user;
        let clock = Clock::get()?;
        
        user.wallet = ctx.accounts.signer.key();
        user.username = username;
        user.display_name = display_name;
        user.role = role;
        user.location = location;
        user.bio = bio;
        user.github_link = github_link;
        user.ipfs_metadata_hash = ipfs_metadata_hash;
        user.reputation = 0;
        user.projects_count = 0;
        user.collabs_count = 0;
        user.member_since = clock.unix_timestamp;
        user.last_active = clock.unix_timestamp;
        user.is_verified = false;
        user.open_to_collab = true;
        user.profile_visibility = ProfileVisibility::Public;
        user.bump = ctx.bumps.user;

        msg!("Enhanced user profile created: {}", user.username);
        Ok(())
    }

    /// Update user profile with enhanced fields
    pub fn update_user(
        ctx: Context<UpdateUser>,
        display_name: Option<String>,
        role: Option<String>,
        location: Option<String>,
        bio: Option<String>,
        github_link: Option<String>,
        ipfs_metadata_hash: Option<String>,
        open_to_collab: Option<bool>,
        profile_visibility: Option<ProfileVisibility>,
    ) -> Result<()> {
        let user = &mut ctx.accounts.user;
        let clock = Clock::get()?;

        if let Some(new_display_name) = display_name {
            require!(new_display_name.len() <= 64, ErrorCode::DisplayNameTooLong);
            user.display_name = new_display_name;
        }
        if let Some(new_role) = role {
            require!(new_role.len() <= 50, ErrorCode::RoleTooLong);
            user.role = new_role;
        }
        if let Some(new_location) = location {
            require!(new_location.len() <= 50, ErrorCode::LocationTooLong);
            user.location = new_location;
        }
        if let Some(new_bio) = bio {
            require!(new_bio.len() <= 200, ErrorCode::BioTooLong);
            user.bio = new_bio;
        }
        if let Some(new_github) = github_link {
            require!(new_github.len() <= 100, ErrorCode::GithubLinkTooLong);
            user.github_link = new_github;
        }
        if let Some(new_hash) = ipfs_metadata_hash {
            require!(new_hash.len() <= 64, ErrorCode::IpfsHashTooLong);
            user.ipfs_metadata_hash = new_hash;
        }
        if let Some(collab) = open_to_collab {
            user.open_to_collab = collab;
        }
        if let Some(visibility) = profile_visibility {
            user.profile_visibility = visibility;
        }

        // Update last active timestamp
        let clock = Clock::get()?;
        user.last_active = clock.unix_timestamp;
        
        msg!("User profile updated: {}", user.username);
        Ok(())
    }

    /// Delete (deactivate) user profile
    pub fn delete_user(ctx: Context<DeleteUser>) -> Result<()> {
        let user = &mut ctx.accounts.user;
        
        // Mark user as inactive by setting open_to_collab to false
        // and clearing personal information
        user.open_to_collab = false;
        user.display_name = String::new();
        user.role = String::new();
        user.location = String::new();
        user.bio = String::new();
        user.github_link = String::new();
        user.ipfs_metadata_hash = String::new();
        
        // Update last active timestamp
        user.last_active = Clock::get()?.unix_timestamp;
        
        msg!("User profile deleted: {}", user.username);
        Ok(())
    }

    // ==================== PROJECT INSTRUCTIONS ====================
    
    /// Create a new project with enhanced fields
    pub fn create_project(
        ctx: Context<CreateProject>,
        name: String,
        description: String,
        github_link: String,
        logo_ipfs_hash: String,
        tech_stack: Vec<String>,
        contribution_needs: Vec<String>,
        collab_intent: String,
        collaboration_level: CollaborationLevel,
        project_status: ProjectStatus,
    ) -> Result<()> {
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(github_link.len() <= 100, ErrorCode::GithubLinkTooLong);
        require!(tech_stack.len() <= 12, ErrorCode::TechTagCountExceeded);
        require!(contribution_needs.len() <= 10, ErrorCode::NeedTagCountExceeded);
        require!(collab_intent.len() <= 300, ErrorCode::CollabIntentTooLong);
        for t in tech_stack.iter() { require!(t.len() <= 24, ErrorCode::TechTagTooLong); }
        for n in contribution_needs.iter() { require!(n.len() <= 24, ErrorCode::NeedTagTooLong); }

        let project = &mut ctx.accounts.project;
        let clock = Clock::get()?;
        
        project.creator = ctx.accounts.creator.key();
        project.name = name;
        project.description = description;
        project.github_link = github_link;
        project.logo_ipfs_hash = logo_ipfs_hash;
        project.tech_stack = tech_stack.into_iter().map(|v| ShortText{ value: v }).collect();
        project.contribution_needs = contribution_needs.into_iter().map(|v| ShortText{ value: v }).collect();
        project.collab_intent = collab_intent;
        project.collaboration_level = collaboration_level;
        project.project_status = project_status;
        project.timestamp = clock.unix_timestamp;
        project.last_updated = clock.unix_timestamp;
        project.contributors_count = 1; // Creator is first contributor
        project.is_active = true;
        project.bump = ctx.bumps.project;

        msg!("Project created: {} by {}", project.name, project.creator);
        Ok(())
    }

    /// Update project details (only by creator)
    pub fn update_project(
        ctx: Context<UpdateProject>,
        name: Option<String>,
        description: Option<String>,
        github_link: Option<String>,
        tech_stack: Option<Vec<String>>,
        contribution_needs: Option<Vec<String>>,
        collab_intent: Option<String>,
        collaboration_level: Option<CollaborationLevel>,
        project_status: Option<ProjectStatus>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let project = &mut ctx.accounts.project;

        if let Some(new_name) = name {
            require!(new_name.len() <= 50, ErrorCode::NameTooLong);
            project.name = new_name;
        }
        if let Some(new_desc) = description {
            require!(new_desc.len() <= 1000, ErrorCode::DescriptionTooLong);
            project.description = new_desc;
        }
        if let Some(new_github) = github_link {
            require!(new_github.len() <= 100, ErrorCode::GithubLinkTooLong);
            project.github_link = new_github;
        }
        if let Some(new_stack) = tech_stack {
            require!(new_stack.len() <= 12, ErrorCode::TechTagCountExceeded);
            for t in new_stack.iter() { require!(t.len() <= 24, ErrorCode::TechTagTooLong); }
            project.tech_stack = new_stack.into_iter().map(|v| ShortText{ value: v }).collect();
        }
        if let Some(new_needs) = contribution_needs {
            require!(new_needs.len() <= 10, ErrorCode::NeedTagCountExceeded);
            for n in new_needs.iter() { require!(n.len() <= 24, ErrorCode::NeedTagTooLong); }
            project.contribution_needs = new_needs.into_iter().map(|v| ShortText{ value: v }).collect();
        }
        if let Some(intent) = collab_intent { 
            require!(intent.len() <= 300, ErrorCode::CollabIntentTooLong);
            project.collab_intent = intent;
        }
        if let Some(new_level) = collaboration_level {
            project.collaboration_level = new_level;
        }
        if let Some(new_status) = project_status {
            project.project_status = new_status;
        }
        if let Some(active) = is_active {
            project.is_active = active;
        }

        // Update last_updated timestamp
        project.last_updated = Clock::get()?.unix_timestamp;

        msg!("Project updated: {}", project.name);
        Ok(())
    }

    // ==================== COLLABORATION REQUEST INSTRUCTIONS ====================
    
    /// Send a collaboration request
    pub fn send_collab_request(
        ctx: Context<SendCollabRequest>,
        message: String,
    ) -> Result<()> {
        require!(message.len() <= 500, ErrorCode::MessageTooLong);

        let request = &mut ctx.accounts.collab_request;
        request.from = ctx.accounts.sender.key();
        request.to = ctx.accounts.project.creator;
        request.project = ctx.accounts.project.key();
        request.message = message;
        request.status = RequestStatus::Pending;
        request.timestamp = Clock::get()?.unix_timestamp;
        request.bump = ctx.bumps.collab_request;

        msg!(
            "Collaboration request sent from {} to {} for project {}",
            request.from,
            request.to,
            request.project
        );
        Ok(())
    }

    /// Accept a collaboration request
    pub fn accept_collab_request(ctx: Context<UpdateCollabRequest>) -> Result<()> {
        let request = &mut ctx.accounts.collab_request;
        require!(
            request.status == RequestStatus::Pending,
            ErrorCode::InvalidRequestStatus
        );

        request.status = RequestStatus::Accepted;
        msg!("Collaboration request accepted: {:?}", request.key());
        Ok(())
    }

    /// Reject a collaboration request
    pub fn reject_collab_request(ctx: Context<UpdateCollabRequest>) -> Result<()> {
        let request = &mut ctx.accounts.collab_request;
        require!(
            request.status == RequestStatus::Pending,
            ErrorCode::InvalidRequestStatus
        );

        request.status = RequestStatus::Rejected;
        msg!("Collaboration request rejected: {:?}", request.key());
        Ok(())
    }
}

// ==================== ACCOUNT CONTEXTS ====================

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + User::INIT_SPACE,
        seeds = [b"user", signer.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateUser<'info> {
    #[account(
        mut,
        seeds = [b"user", signer.key().as_ref()],
        bump = user.bump,
        has_one = wallet
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    /// CHECK: This is the wallet that must match the user's wallet
    pub wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateProject<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Project::INIT_SPACE,
        seeds = [b"project", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProject<'info> {
    #[account(
        mut,
        seeds = [b"project", creator.key().as_ref(), project.name.as_bytes()],
        bump = project.bump,
        has_one = creator
    )]
    pub project: Account<'info, Project>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct SendCollabRequest<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + CollaborationRequest::INIT_SPACE,
        seeds = [
            b"collab_request",
            sender.key().as_ref(),
            project.key().as_ref()
        ],
        bump
    )]
    pub collab_request: Account<'info, CollaborationRequest>,
    
    #[account(mut)]
    pub sender: Signer<'info>,
    
    pub project: Account<'info, Project>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCollabRequest<'info> {
    #[account(
        mut,
        seeds = [
            b"collab_request",
            collab_request.from.as_ref(),
            collab_request.project.as_ref()
        ],
        bump = collab_request.bump,
        has_one = to
    )]
    pub collab_request: Account<'info, CollaborationRequest>,
    
    #[account(mut)]
    pub project_owner: Signer<'info>,
    
    /// CHECK: This is the 'to' address that must match
    pub to: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DeleteUser<'info> {
    #[account(
        mut,
        seeds = [b"user", signer.key().as_ref()],
        bump = user.bump,
        has_one = wallet
    )]
    pub user: Account<'info, User>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    /// CHECK: This is the wallet that must match the user's wallet
    pub wallet: AccountInfo<'info>,
}

// ==================== ACCOUNT STRUCTURES ====================

#[account]
#[derive(InitSpace)]
pub struct User {
    pub wallet: Pubkey,                      // 32 bytes
    #[max_len(32)]
    pub username: String,                    // 4 + 32 = 36 bytes
    #[max_len(64)]
    pub display_name: String,                // 4 + 64 = 68 bytes
    #[max_len(50)]
    pub role: String,                        // 4 + 50 = 54 bytes
    #[max_len(50)]
    pub location: String,                    // 4 + 50 = 54 bytes
    #[max_len(200)]
    pub bio: String,                         // 4 + 200 = 204 bytes
    #[max_len(100)]
    pub github_link: String,                 // 4 + 100 = 104 bytes
    #[max_len(64)]
    pub ipfs_metadata_hash: String,          // 4 + 64 = 68 bytes (link to IPFS for extended data)
    pub reputation: u32,                     // 4 bytes
    pub projects_count: u32,                 // 4 bytes
    pub collabs_count: u32,                  // 4 bytes
    pub member_since: i64,                   // 8 bytes
    pub last_active: i64,                    // 8 bytes
    pub is_verified: bool,                   // 1 byte
    pub open_to_collab: bool,                // 1 byte
    pub profile_visibility: ProfileVisibility, // 1 byte
    pub bump: u8,                            // 1 byte
}
// Total: ~656 bytes (well under 4KB!)

#[account]
#[derive(InitSpace)]
pub struct Project {
    pub creator: Pubkey,                        // 32 bytes
    #[max_len(50)]
    pub name: String,                           // 4 + 50 = 54 bytes
    #[max_len(1000)]
    pub description: String,                    // 4 + 1000 = 1004 bytes
    #[max_len(100)]
    pub github_link: String,                    // 4 + 100 = 104 bytes
    #[max_len(64)]
    pub logo_ipfs_hash: String,                 // 4 + 64 = 68 bytes (IPFS hash for project logo)
    // Tech stack as tags (up to 12 tags, each up to 24 chars)
    #[max_len(12)]
    pub tech_stack: Vec<ShortText>,             // variable
    // Contribution needs as tags (up to 10 tags, each up to 24 chars)
    #[max_len(10)]
    pub contribution_needs: Vec<ShortText>,     // variable
    // Free text intent
    #[max_len(300)]
    pub collab_intent: String,                  // 4 + 300 = 304 bytes
    pub collaboration_level: CollaborationLevel, // 1 byte (enum)
    pub project_status: ProjectStatus,          // 1 byte (enum)
    pub timestamp: i64,                         // 8 bytes
    pub last_updated: i64,                      // 8 bytes
    pub contributors_count: u16,                // 2 bytes
    pub is_active: bool,                        // 1 byte
    pub bump: u8,                               // 1 byte
}
// Total: ~<= 4KB (well under limit with tagged vectors)

#[account]
#[derive(InitSpace)]
pub struct CollaborationRequest {
    pub from: Pubkey,             // 32 bytes
    pub to: Pubkey,               // 32 bytes
    pub project: Pubkey,          // 32 bytes
    #[max_len(500)]
    pub message: String,          // 4 + 500 = 504 bytes
    pub status: RequestStatus,    // 1 byte
    pub timestamp: i64,           // 8 bytes
    pub bump: u8,                 // 1 byte
}
// Total: ~610 bytes (well under 4KB)

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum RequestStatus {
    Pending,
    Accepted,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProfileVisibility {
    Public,
    Private,
    FriendsOnly,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum CollaborationLevel {
    Beginner,       // Just starting out
    Intermediate,   // 1-2 years experience
    Advanced,       // 3+ years experience
    AllLevels,      // Open to all skill levels
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub struct ShortText {
    #[max_len(24)]
    pub value: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProjectStatus {
    JustStarted,    // 0-25% complete
    InProgress,     // 25-75% complete
    NearlyComplete, // 75-95% complete
    Completed,      // 100% complete, maintenance mode
    ActiveDev,      // Ongoing active development
    OnHold,         // Paused/inactive
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum ErrorCode {
    #[msg("Username must be 32 characters or less")]
    UsernameTooLong,
    
    #[msg("GitHub link must be 100 characters or less")]
    GithubLinkTooLong,
    
    #[msg("Bio must be 200 characters or less")]
    BioTooLong,
    
    #[msg("Display name must be 64 characters or less")]
    DisplayNameTooLong,
    
    #[msg("Role must be 50 characters or less")]
    RoleTooLong,
    
    #[msg("Location must be 50 characters or less")]
    LocationTooLong,
    
    #[msg("IPFS hash must be 64 characters or less")]
    IpfsHashTooLong,
    
    #[msg("Project name must be 50 characters or less")]
    NameTooLong,
    
    #[msg("Description must be 1000 characters or less")]
    DescriptionTooLong,
    
    #[msg("Collaboration level must be 30 characters or less")]
    CollabLevelTooLong,
    
    #[msg("Tech tag must be 24 characters or less")]
    TechTagTooLong,
    
    #[msg("Contribution need tag must be 24 characters or less")]
    NeedTagTooLong,
    
    #[msg("Too many tech tags (max 12)")]
    TechTagCountExceeded,
    
    #[msg("Too many contribution need tags (max 10)")]
    NeedTagCountExceeded,
    
    #[msg("Collaboration intent must be 300 characters or less")]
    CollabIntentTooLong,
    
    #[msg("Message must be 500 characters or less")]
    MessageTooLong,
    
    #[msg("Invalid request status for this operation")]
    InvalidRequestStatus,
}
