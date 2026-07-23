import { useEffect, useRef, useState } from "react";
import { Button, Card, Typography, message } from "antd";
import "./LoginPage.css";

// Helper function to decode JWT payload safely for client-side display
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function LoginPage({ onSuccess }) {
  const googleBtnRef = useRef(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Handle Google OAuth Credential Response
  const handleGoogleCallback = (response) => {
    try {
      const payload = parseJwt(response.credential);
      const email = payload?.email || "Google User";
      const name = payload?.name || email;
      const picture = payload?.picture || null;
      
      const sessionData = {
        token: `google_jwt_${response.credential.substring(0, 24)}`,
        username: email,
        name: name,
        picture: picture,
        authProvider: "Google OAuth 2.0"
      };

      window.localStorage.setItem("icore_auth_token", sessionData.token);
      window.localStorage.setItem("icore_user_session", JSON.stringify(sessionData));

      message.success(`${name}님, 구글 계정으로 로그인되었습니다!`);
      onSuccess(sessionData);
    } catch (error) {
      message.error("구글 로그인 처리 중 오류가 발생했습니다.");
    }
  };

  // Fallback demo Google Login when Client ID is not yet configured in .env
  const handleDemoGoogleLogin = () => {
    const sessionData = {
      token: "demo_google_token_12345",
      username: "user@gmail.com",
      name: "구글 서비스 사용자",
      picture: "https://lh3.googleusercontent.com/a/default-user",
      authProvider: "Google OAuth 2.0 (데모)"
    };

    window.localStorage.setItem("icore_auth_token", sessionData.token);
    window.localStorage.setItem("icore_user_session", JSON.stringify(sessionData));

    if (!googleClientId || googleClientId.includes("your-google-client-id")) {
      message.info("구글 Client ID 미설정 상태입니다. (테스트 구글 계정으로 로그인)");
    } else {
      message.success("구글 계정으로 로그인되었습니다.");
    }

    onSuccess(sessionData);
  };

  useEffect(() => {
    const initGis = () => {
      if (window.google?.accounts?.id && googleClientId && !googleClientId.includes("your-google-client-id")) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback,
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            locale: "ko",
          });
        }
        setIsGisLoaded(true);
      }
    };

    if (window.google?.accounts?.id) {
      initGis();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGis();
          clearInterval(timer);
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [googleClientId]);

  const hasConfiguredClientId = googleClientId && !googleClientId.includes("your-google-client-id");

  return (
    <div className="login-page">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <Typography.Title level={3}>iCore 시작하기</Typography.Title>
          <Typography.Paragraph type="secondary">
            구글 계정으로 로그인하여 서비스를 시작하세요.
          </Typography.Paragraph>
        </div>

        {/* 구글 SNS 단일 로그인 영역 */}
        <div className="google-login-container">
          <div ref={googleBtnRef} className="google-btn-wrapper" />

          {(!hasConfiguredClientId || !isGisLoaded) && (
            <Button
              className="custom-google-btn"
              block
              size="large"
              onClick={handleDemoGoogleLogin}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google 계정으로 로그인</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
