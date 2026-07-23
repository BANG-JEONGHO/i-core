import { Avatar, Button, Card, Descriptions, Tag, Typography } from "antd";
import "./Dashboard.css";

function Dashboard({ session, onLogout }) {
  return (
    <div className="dashboard-container">
      <Card className="dashboard-card" bordered={false}>
        <div className="dashboard-header">
          <div className="user-profile">
            <Avatar size={64} src={session.picture} style={{ backgroundColor: "#1890ff" }}>
              {session.name?.[0] || "U"}
            </Avatar>
            <div className="user-info">
              <Typography.Title level={4} style={{ margin: 0 }}>
                {session.name}
              </Typography.Title>
              <Typography.Text type="secondary">{session.username}</Typography.Text>
            </div>
          </div>
          <Tag color="blue">{session.authProvider || "구글 계정 인증"}</Tag>
        </div>

        <Descriptions title="인증 세션 정보" bordered column={1} size="small" style={{ marginTop: 24 }}>
          <Descriptions.Item label="인증 방식">{session.authProvider}</Descriptions.Item>
          <Descriptions.Item label="계정 이메일">{session.username}</Descriptions.Item>
          <Descriptions.Item label="세션 토큰">{session.token}</Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 28, textAlign: "right" }}>
          <Button type="primary" danger onClick={onLogout}>
            로그아웃
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
